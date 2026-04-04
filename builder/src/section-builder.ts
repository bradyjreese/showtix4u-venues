import { Circle, FabricText, Group, Rect } from "fabric";
import type { NumberingScheme } from "./numbering";
import { generateSeatNumbers } from "./numbering";
import { getSeatColor } from "./seat-colors";
import type { RowData, SeatData, SectionData } from "./types";

/** Space reserved for the left row label column — must be wider than label box + seat radius + gap */
const ROW_LABEL_WIDTH = 44;

/** Creates a row label: white rounded rect background + dark text, vertically centered with seats.
 *  cx/y is the center point of the label. */
function createRowLabel(name: string, cx: number, y: number): (Rect | FabricText)[] {
	const fontSize = 11;
	const boxWidth = Math.max(name.length * 7 + 8, 22);
	const boxHeight = fontSize + 6;

	const bg = new Rect({
		width: boxWidth,
		height: boxHeight,
		fill: "#ffffff",
		stroke: "#cccccc",
		strokeWidth: 1,
		rx: 3,
		ry: 3,
		originX: "center",
		originY: "center",
		left: cx,
		top: y,
		selectable: false,
	});

	const text = new FabricText(name, {
		fontSize,
		fontFamily: "sans-serif",
		fontWeight: "bold",
		fill: "#333333",
		originX: "center",
		originY: "center",
		left: cx,
		top: y,
		selectable: false,
	});

	return [bg, text];
}

export function createSectionGroup(section: SectionData): Group {
	const objects: (Circle | FabricText | Rect)[] = [];
	const maxSeats = Math.max(...section.rows.map((r) => r.seats.length), 1);

	// Section name label
	const label = new FabricText(section.sectionName, {
		fontSize: 14,
		fontFamily: "sans-serif",
		fill: "#ffffff",
		fontWeight: "bold",
		originX: "center",
		left: ROW_LABEL_WIDTH + (maxSeats * section.seatSpacing) / 2,
		top: -22,
		selectable: false,
	});
	objects.push(label);

	for (let r = 0; r < section.rows.length; r++) {
		const row = section.rows[r];
		const y = r * section.rowSpacing;

		// Per-row label visibility overrides section-level setting
		const labelVis = row.labelSide ?? section.rowLabelVisibility ?? "both";

		// Center this row relative to the widest row
		const rowWidth = row.seats.length * section.seatSpacing;
		const maxWidth = maxSeats * section.seatSpacing;
		const rowOffsetX = (maxWidth - rowWidth) / 2;

		// Row label (left side) — centered in the label gutter
		if (labelVis === "both" || labelVis === "left") {
			objects.push(...createRowLabel(row.rowName, 14, y));
		}

		for (let s = 0; s < row.seats.length; s++) {
			const seat = row.seats[s];
			const baseX = ROW_LABEL_WIDTH + rowOffsetX + s * section.seatSpacing;
			const baseY = y;
			const x = baseX + (seat.offsetX ?? 0);
			const seatY = baseY + (seat.offsetY ?? 0);

			const colors = getSeatColor(seat.type);

			if (section.seatShape === "square") {
				const rect = new Rect({
					width: section.seatSize * 2,
					height: section.seatSize * 2,
					fill: colors.fill,
					stroke: colors.stroke,
					strokeWidth: 1,
					left: x,
					top: seatY,
					originX: "center",
					originY: "center",
					rx: 2,
					ry: 2,
					selectable: false,
					hoverCursor: "default",
				});
				(rect as any).seatData = seat;
				objects.push(rect);
			} else {
				const circle = new Circle({
					radius: section.seatSize,
					fill: colors.fill,
					stroke: colors.stroke,
					strokeWidth: 1,
					left: x,
					top: seatY,
					originX: "center",
					originY: "center",
					selectable: false,
					hoverCursor: "default",
				});
				(circle as any).seatData = seat;
				objects.push(circle);
			}

			// Seat number label
			if (section.seatSize >= 8) {
				objects.push(
					new FabricText(seat.seatName, {
						fontSize: Math.min(7, section.seatSize - 1),
						fontFamily: "sans-serif",
						fill: "#ffffff",
						originX: "center",
						originY: "center",
						left: x,
						top: seatY,
						selectable: false,
					}),
				);
			}
		}

		// Row label (right side) — after last seat with gap
		if (labelVis === "both" || labelVis === "right") {
			const rightX = ROW_LABEL_WIDTH + rowOffsetX + row.seats.length * section.seatSpacing + section.seatSize + 8;
			objects.push(...createRowLabel(row.rowName, rightX, y));
		}
	}

	const group = new Group(objects, {
		left: section.x,
		top: section.y,
		angle: section.angle,
		hasControls: true,
		hasBorders: true,
		borderColor: "#e94560",
		cornerColor: "#e94560",
		cornerStyle: "circle",
		transparentCorners: false,
		cornerSize: 12,
		padding: 10,
	});

	(group as any).sectionData = section;
	return group;
}

export function rebuildSection(canvas: any, oldGroup: Group, newData: SectionData): Group {
	canvas.remove(oldGroup);
	const newGroup = createSectionGroup(newData);
	canvas.add(newGroup);
	canvas.setActiveObject(newGroup);
	canvas.requestRenderAll();
	return newGroup;
}

export function buildSectionData(
	name: string,
	rowDefs: { name: string; seatCount: number; startSeat: number; numbering: NumberingScheme }[],
	x: number,
	y: number,
	seatShape: SectionData["seatShape"] = "circle",
	seatSize = 10,
	rowSpacing = 28,
	seatSpacing = 28,
): SectionData {
	const rows: RowData[] = rowDefs.map((def, r) => {
		const seatNames = generateSeatNumbers(def.seatCount, def.startSeat, def.numbering);
		const seats: SeatData[] = seatNames.map((seatName, s) => ({
			seatId: `${name}-${def.name}-${seatName}`,
			seatName,
			seatOrder: s + 1,
			type: "available" as const,
		}));
		return {
			rowId: `${name}-${def.name}`,
			rowName: def.name,
			rowNumber: r + 1,
			seats,
		};
	});

	return {
		sectionId: crypto.randomUUID(),
		sectionName: name,
		rows,
		x,
		y,
		angle: 0,
		seatShape,
		seatSize,
		rowSpacing,
		seatSpacing,
	};
}

export function extractSectionData(group: Group): SectionData {
	const data = (group as any).sectionData as SectionData;
	return {
		...data,
		x: group.left ?? data.x,
		y: group.top ?? data.y,
		angle: group.angle ?? data.angle,
	};
}

export function createStage(x: number, y: number, width = 300, height = 60): Group {
	const rect = new Rect({
		width,
		height,
		fill: "#2a2a4a",
		stroke: "#555577",
		strokeWidth: 2,
		rx: 8,
		ry: 8,
		selectable: false,
	});

	const label = new FabricText("STAGE", {
		fontSize: 20,
		fontFamily: "sans-serif",
		fill: "#888899",
		fontWeight: "bold",
		originX: "center",
		originY: "center",
		left: width / 2,
		top: height / 2,
		selectable: false,
	});

	const group = new Group([rect, label], {
		left: x,
		top: y,
		hasControls: true,
		hasBorders: true,
		borderColor: "#555577",
		cornerColor: "#555577",
		cornerStyle: "circle",
		transparentCorners: false,
		cornerSize: 12,
	});

	(group as any).isStage = true;
	return group;
}
