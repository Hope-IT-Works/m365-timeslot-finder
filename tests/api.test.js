import { describe, test, expect } from 'bun:test';

const { GraphAPI } = require('../utils/api.js');

// ---------------------------------------------------------------------------
// GraphAPI.renderTemplate
// ---------------------------------------------------------------------------
describe('GraphAPI.renderTemplate', () => {
    test('replaces a single variable', () => {
        expect(GraphAPI.renderTemplate('Hello {{name}}', { name: 'World' }))
            .toBe('Hello World');
    });

    test('replaces multiple variables', () => {
        const result = GraphAPI.renderTemplate('{{datum}} at {{startzeit}}', {
            datum: '10.06.2026',
            startzeit: '09:00',
        });
        expect(result).toBe('10.06.2026 at 09:00');
    });

    test('replaces the same variable multiple times (global regex)', () => {
        expect(GraphAPI.renderTemplate('{{a}}-{{a}}-{{a}}', { a: 'x' })).toBe('x-x-x');
    });

    test('replaces null values with an empty string', () => {
        expect(GraphAPI.renderTemplate('{{value}}', { value: null })).toBe('');
    });

    test('leaves unknown template variables unchanged', () => {
        expect(GraphAPI.renderTemplate('{{known}} {{unknown}}', { known: 'hello' }))
            .toBe('hello {{unknown}}');
    });

    test('returns template unchanged for an empty variables object', () => {
        expect(GraphAPI.renderTemplate('No placeholder', {})).toBe('No placeholder');
    });

    test('handles an empty template string correctly', () => {
        expect(GraphAPI.renderTemplate('', { a: '1' })).toBe('');
    });
});

// ---------------------------------------------------------------------------
// GraphAPI.groupConsecutiveSlots
// ---------------------------------------------------------------------------
describe('GraphAPI.groupConsecutiveSlots', () => {
    const api = new GraphAPI({ getAccessToken: async () => 'mock-token' });
    const slot = (start, end) => ({ start: new Date(start), end: new Date(end) });

    test('returns an empty array for empty input', () => {
        expect(api.groupConsecutiveSlots([])).toEqual([]);
    });

    test('returns an empty array for null/undefined input', () => {
        expect(api.groupConsecutiveSlots(null)).toEqual([]);
        expect(api.groupConsecutiveSlots(undefined)).toEqual([]);
    });

    test('wraps a single slot in one group', () => {
        const s = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const groups = api.groupConsecutiveSlots([s]);
        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveLength(1);
        expect(groups[0][0]).toBe(s);
    });

    test('merges two directly consecutive slots into one group', () => {
        const s1 = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const s2 = slot('2026-06-10T09:30:00', '2026-06-10T10:00:00');
        const groups = api.groupConsecutiveSlots([s1, s2]);
        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveLength(2);
    });

    test('separates two non-consecutive slots into distinct groups', () => {
        const s1 = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const s2 = slot('2026-06-10T10:00:00', '2026-06-10T10:30:00');
        const groups = api.groupConsecutiveSlots([s1, s2]);
        expect(groups).toHaveLength(2);
    });

    test('sorts slots before grouping', () => {
        const s1 = slot('2026-06-10T10:00:00', '2026-06-10T10:30:00');
        const s2 = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const s3 = slot('2026-06-10T11:00:00', '2026-06-10T11:30:00');
        const groups = api.groupConsecutiveSlots([s1, s2, s3]);
        // No group is consecutive → 3 individual groups, first starts earliest
        expect(groups).toHaveLength(3);
        expect(groups[0][0].start.getTime()).toBe(s2.start.getTime());
    });

    test('merges three directly consecutive slots into one group', () => {
        const s1 = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const s2 = slot('2026-06-10T09:30:00', '2026-06-10T10:00:00');
        const s3 = slot('2026-06-10T10:00:00', '2026-06-10T10:30:00');
        const groups = api.groupConsecutiveSlots([s1, s2, s3]);
        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveLength(3);
    });

    test('handles a mix of consecutive and non-consecutive slots', () => {
        const s1 = slot('2026-06-10T09:00:00', '2026-06-10T09:30:00');
        const s2 = slot('2026-06-10T09:30:00', '2026-06-10T10:00:00');
        const s3 = slot('2026-06-10T11:00:00', '2026-06-10T11:30:00');
        const groups = api.groupConsecutiveSlots([s1, s2, s3]);
        expect(groups).toHaveLength(2);
        expect(groups[0]).toHaveLength(2); // s1 + s2
        expect(groups[1]).toHaveLength(1); // s3
    });
});

// ---------------------------------------------------------------------------
// GraphAPI.processMeetingTimeSuggestions
// ---------------------------------------------------------------------------
describe('GraphAPI.processMeetingTimeSuggestions', () => {
    const api = new GraphAPI({ getAccessToken: async () => 'mock-token' });

    const makeSuggestion = (startIso, endIso, confidence = 100) => ({
        confidence,
        meetingTimeSlot: {
            start: { dateTime: startIso },
            end: { dateTime: endIso },
        },
        suggestionReason: 'Attendee availability',
    });

    test('returns an empty array when meetingTimeSuggestions is missing', () => {
        expect(
            api.processMeetingTimeSuggestions({}, '2026-06-10T09:00:00', '2026-06-10T17:00:00')
        ).toEqual([]);
    });

    test('returns an empty array for an empty suggestions list', () => {
        expect(
            api.processMeetingTimeSuggestions(
                { meetingTimeSuggestions: [] },
                '2026-06-10T09:00:00',
                '2026-06-10T17:00:00'
            )
        ).toEqual([]);
    });

    test('filters out suggestions with confidence < 50', () => {
        const response = {
            meetingTimeSuggestions: [
                makeSuggestion('2026-06-10T10:00:00', '2026-06-10T11:00:00', 49),
            ],
        };
        expect(
            api.processMeetingTimeSuggestions(response, '2026-06-10T09:00:00', '2026-06-10T17:00:00')
        ).toHaveLength(0);
    });

    test('keeps suggestions with confidence = 50', () => {
        const response = {
            meetingTimeSuggestions: [
                makeSuggestion('2026-06-10T10:00:00', '2026-06-10T11:00:00', 50),
            ],
        };
        expect(
            api.processMeetingTimeSuggestions(response, '2026-06-10T09:00:00', '2026-06-10T17:00:00')
        ).toHaveLength(1);
    });

    test('returns slot objects with start, end, confidence and suggestionReason', () => {
        const response = {
            meetingTimeSuggestions: [
                makeSuggestion('2026-06-10T10:00:00', '2026-06-10T11:00:00', 100),
            ],
        };
        const slots = api.processMeetingTimeSuggestions(
            response,
            '2026-06-10T09:00:00',
            '2026-06-10T17:00:00'
        );
        expect(slots[0]).toHaveProperty('start');
        expect(slots[0]).toHaveProperty('end');
        expect(slots[0]).toHaveProperty('confidence', 100);
        expect(slots[0]).toHaveProperty('suggestionReason', 'Attendee availability');
        expect(slots[0].start).toBeInstanceOf(Date);
        expect(slots[0].end).toBeInstanceOf(Date);
    });

    test('filters out slots outside the overall time range', () => {
        const response = {
            meetingTimeSuggestions: [
                // Before start time → should be filtered out
                makeSuggestion('2026-06-10T07:00:00', '2026-06-10T07:30:00', 100),
                // Within valid range → should be kept
                makeSuggestion('2026-06-10T10:00:00', '2026-06-10T10:30:00', 100),
            ],
        };
        const slots = api.processMeetingTimeSuggestions(
            response,
            '2026-06-10T09:00:00',
            '2026-06-10T17:00:00'
        );
        expect(slots).toHaveLength(1);
    });

    test('returns all valid slots', () => {
        const response = {
            meetingTimeSuggestions: [
                makeSuggestion('2026-06-10T09:00:00', '2026-06-10T10:00:00', 100),
                makeSuggestion('2026-06-10T11:00:00', '2026-06-10T12:00:00', 75),
                makeSuggestion('2026-06-10T14:00:00', '2026-06-10T15:00:00', 90),
            ],
        };
        const slots = api.processMeetingTimeSuggestions(
            response,
            '2026-06-10T09:00:00',
            '2026-06-10T17:00:00'
        );
        expect(slots).toHaveLength(3);
    });
});
