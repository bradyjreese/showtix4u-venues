export const SEAT_COLORS: Record<string, { fill: string; stroke: string }> = {
	available: { fill: "#5b9bd5", stroke: "#3a7cc2" },
	wheelchair: { fill: "#86dedd", stroke: "#5cb8b7" },
	handicap: { fill: "#fffc9e", stroke: "#ccca7e" },
	companion: { fill: "#bbd9ff", stroke: "#8ab0dd" },
	obstructed: { fill: "#f4d2ff", stroke: "#c4a8cc" },
	unavailable: { fill: "#666666", stroke: "#444444" },
	empty: { fill: "#2a2a3e", stroke: "#444466" },
};

export function getSeatColor(type: string) {
	return SEAT_COLORS[type] ?? SEAT_COLORS.available;
}
