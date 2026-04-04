/**
 * Seat numbering schemes for theater-style venues.
 *
 * - ascending:      1, 2, 3, 4, 5...          (L→R, simple)
 * - descending:     10, 9, 8, 7...            (R→L)
 * - odd-ascending:  1, 3, 5, 7, 9...          (left sections, L→R)
 * - odd-descending: 9, 7, 5, 3, 1...          (left sections, R→L / aisle-out)
 * - even-ascending: 2, 4, 6, 8, 10...         (right sections, L→R)
 * - even-descending: 10, 8, 6, 4, 2...        (right sections, R→L / aisle-out)
 */
export type NumberingScheme =
	| "ascending"
	| "descending"
	| "odd-ascending"
	| "odd-descending"
	| "even-ascending"
	| "even-descending";

export const NUMBERING_LABELS: Record<NumberingScheme, string> = {
	ascending: "1, 2, 3, 4...",
	descending: "10, 9, 8, 7...",
	"odd-ascending": "1, 3, 5, 7...",
	"odd-descending": "7, 5, 3, 1...",
	"even-ascending": "2, 4, 6, 8...",
	"even-descending": "8, 6, 4, 2...",
};

/**
 * Generate seat numbers for a row.
 * @param count     Number of seats in the row
 * @param startSeat Starting number (e.g. 1, 101, etc.)
 * @param scheme    Numbering pattern
 * @returns Array of seat number strings, in physical L→R order
 */
export function generateSeatNumbers(count: number, startSeat: number, scheme: NumberingScheme): string[] {
	const numbers: number[] = [];

	switch (scheme) {
		case "ascending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + i);
			break;

		case "descending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + count - 1 - i);
			break;

		case "odd-ascending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + i * 2);
			break;

		case "odd-descending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + (count - 1 - i) * 2);
			break;

		case "even-ascending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + i * 2);
			break;

		case "even-descending":
			for (let i = 0; i < count; i++) numbers.push(startSeat + (count - 1 - i) * 2);
			break;
	}

	return numbers.map(String);
}

/**
 * Get the default start number for a scheme.
 * Odd schemes start at 1, even schemes start at 2, others at 1.
 */
export function defaultStartForScheme(scheme: NumberingScheme): number {
	if (scheme.startsWith("even")) return 2;
	return 1;
}
