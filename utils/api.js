// Microsoft Graph API utility functions
class GraphAPI {
    constructor(authManager) {
        this.authManager = authManager;
        this.baseUrl = 'https://graph.microsoft.com/v1.0';
    }

    static get DEFAULT_TEMPLATE() {
        return i18n.getMessage('defaultTemplate');
    }

    static renderTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
            result = result.replace(regex, value != null ? String(value) : '');
        }
        return result;
    }

    // Search for users by name or email
    async searchUsers(query) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const token = await this.authManager.getAccessToken();
        // Escape single quotes for OData filter syntax, then URL-encode
        const odataSafeQuery = query.trim().replace(/'/g, "''");
        const encodedQuery = encodeURIComponent(odataSafeQuery);
        
        const response = await fetch(
            `${this.baseUrl}/users?$filter=startswith(displayName,'${encodedQuery}') or startswith(mail,'${encodedQuery}') or startswith(userPrincipalName,'${encodedQuery}')&$select=id,displayName,mail,userPrincipalName&$top=10`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(i18n.getMessage('apiUserSearchError'));
        }

        const data = await response.json();
        return data.value || [];
    }

    // Find meeting times using Microsoft Graph findMeetingTimes API
    async findMeetingTimes(attendeeEmails, startTime, endTime, durationMinutes) {
        const token = await this.authManager.getAccessToken();
        
        // Prepare attendees array
        const attendees = attendeeEmails.map(email => ({
            emailAddress: {
                address: email
            },
            type: 'required'
        }));

        const requestBody = {
            attendees: attendees,
            timeConstraint: {
                timeslots: [
                    {
                        start: {
                            dateTime: startTime,
                            timeZone: 'Europe/Berlin'
                        },
                        end: {
                            dateTime: endTime,
                            timeZone: 'Europe/Berlin'
                        }
                    }
                ]
            },
            meetingDuration: `PT${durationMinutes}M`,
            returnSuggestionReasons: true,
            minimumAttendeePercentage: 100,
            maxCandidates: 50,
            isOrganizerOptional: false
        };

        const response = await fetch(
            `${this.baseUrl}/me/findMeetingTimes`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'outlook.timezone="Europe/Berlin"'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || i18n.getMessage('apiMeetingTimesError'));
        }

        const data = await response.json();
        return data;
    }

    // Process findMeetingTimes response and convert to slot format
    processMeetingTimeSuggestions(apiResponse, startDateTime, endDateTime) {
        if (!apiResponse.meetingTimeSuggestions || apiResponse.meetingTimeSuggestions.length === 0) {
            return [];
        }

        const startLimit = new Date(startDateTime);
        const endLimit = new Date(endDateTime);
        
        // Extract time boundaries for daily filtering
        const startTimeMinutes = startLimit.getHours() * 60 + startLimit.getMinutes();
        const endTimeMinutes = endLimit.getHours() * 60 + endLimit.getMinutes();

        return apiResponse.meetingTimeSuggestions
            .filter(suggestion => suggestion.confidence >= 50) // Filter by confidence
            .map(suggestion => ({
                start: new Date(suggestion.meetingTimeSlot.start.dateTime),
                end: new Date(suggestion.meetingTimeSlot.end.dateTime),
                confidence: suggestion.confidence,
                suggestionReason: suggestion.suggestionReason
            }))
            .filter(slot => {
                // Ensure slot is completely within the date/time boundaries
                if (slot.start < startLimit || slot.end > endLimit) {
                    return false;
                }
                
                // Also check daily time boundaries (e.g., no slots after 17:00 each day)
                const slotStartMinutes = slot.start.getHours() * 60 + slot.start.getMinutes();
                const slotEndMinutes = slot.end.getHours() * 60 + slot.end.getMinutes();
                
                return slotStartMinutes >= startTimeMinutes && slotEndMinutes <= endTimeMinutes;
            });
    }

    // Group consecutive slots together
    groupConsecutiveSlots(slots) {
        if (!slots || slots.length === 0) return [];

        // Sort slots by start time
        const sortedSlots = [...slots].sort((a, b) => a.start - b.start);
        const groups = [];
        let currentGroup = [sortedSlots[0]];

        for (let i = 1; i < sortedSlots.length; i++) {
            const prevSlot = currentGroup[currentGroup.length - 1];
            const currentSlot = sortedSlots[i];

            // Check if current slot starts immediately after previous slot ends
            if (prevSlot.end.getTime() === currentSlot.start.getTime()) {
                currentGroup.push(currentSlot);
            } else {
                groups.push(currentGroup);
                currentGroup = [currentSlot];
            }
        }
        groups.push(currentGroup);

        return groups;
    }

    // Format slot group for display
    formatSlotGroup(group, durationMinutes, template, slotNumber) {
        const firstSlot = group[0];
        const lastSlot = group[group.length - 1];

        const locale = i18n.locale === 'de' ? 'de-DE' : 'en-US';
        const fullDateOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
        const shortDateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };

        const date = firstSlot.start.toLocaleDateString(locale, fullDateOptions);
        const dateShort = firstSlot.start.toLocaleDateString(locale, shortDateOptions);
        const weekday = firstSlot.start.toLocaleDateString(locale, { weekday: 'long' });
        const weekdayShort = firstSlot.start.toLocaleDateString(locale, { weekday: 'short' });
        const monthName = firstSlot.start.toLocaleDateString(locale, { month: 'long' });
        const monthNameShort = firstSlot.start.toLocaleDateString(locale, { month: 'short' });
        const startTimeStr = firstSlot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTimeStr = lastSlot.end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
        const day = firstSlot.start.getDate();
        const month = firstSlot.start.getMonth() + 1;
        const year = firstSlot.start.getFullYear();

        const usedTemplate = template || GraphAPI.DEFAULT_TEMPLATE;
        const copyText = GraphAPI.renderTemplate(usedTemplate, {
            date,
            weekday,
            weekday_short: weekdayShort,
            date_short: dateShort,
            day: String(day),
            day_long: String(day).padStart(2, '0'),
            month: String(month),
            month_long: String(month).padStart(2, '0'),
            month_name: monthName,
            month_name_short: monthNameShort,
            year: String(year),
            start_time: startTimeStr,
            end_time: endTimeStr,
            duration: String(durationMinutes),
            number: slotNumber != null ? String(slotNumber) : '',
            number_dot: slotNumber != null ? '.' : '',
            number_space: slotNumber != null ? ' ' : ''
        });

        return {
            date,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: durationMinutes,
            copyText
        };
    }

    // Format slot for display
    formatSlot(slot, durationMinutes, template, slotNumber) {
        return this.formatSlotGroup([slot], durationMinutes, template, slotNumber);
    }
}

// Export singleton instance (browser context; authManager comes from auth.js loaded earlier)
if (typeof authManager !== 'undefined') {
    var graphAPI = new GraphAPI(authManager); // eslint-disable-line no-var
}

// CommonJS export for test environments
if (typeof module !== 'undefined') module.exports = { GraphAPI };
