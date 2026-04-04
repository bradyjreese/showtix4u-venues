import { Circle, Ellipse, FabricText, Group, Rect } from "fabric";
import { getSeatColor } from "./seat-colors";
import type { SeatData, TableData } from "./types";

export function createTableGroup(table: TableData): Group {
	const objects: (Circle | Ellipse | FabricText | Rect)[] = [];

	// Table surface
	if (table.tableShape === "circle") {
		const radius = Math.min(table.tableWidth, table.tableHeight) / 2;
		objects.push(
			new Circle({
				radius,
				fill: "#3a3a5c",
				stroke: "#5a5a7c",
				strokeWidth: 2,
				left: table.tableWidth / 2,
				top: table.tableHeight / 2,
				originX: "center",
				originY: "center",
				selectable: false,
			}),
		);
	} else if (table.tableShape === "oval") {
		objects.push(
			new Ellipse({
				rx: table.tableWidth / 2,
				ry: table.tableHeight / 2,
				fill: "#3a3a5c",
				stroke: "#5a5a7c",
				strokeWidth: 2,
				left: table.tableWidth / 2,
				top: table.tableHeight / 2,
				originX: "center",
				originY: "center",
				selectable: false,
			}),
		);
	} else {
		objects.push(
			new Rect({
				width: table.tableWidth,
				height: table.tableHeight,
				fill: "#3a3a5c",
				stroke: "#5a5a7c",
				strokeWidth: 2,
				rx: table.tableShape === "square" ? 2 : 4,
				ry: table.tableShape === "square" ? 2 : 4,
				left: 0,
				top: 0,
				selectable: false,
			}),
		);
	}

	// Table name label
	objects.push(
		new FabricText(table.tableName, {
			fontSize: 12,
			fontFamily: "sans-serif",
			fill: "#888899",
			fontWeight: "bold",
			originX: "center",
			originY: "center",
			left: table.tableWidth / 2,
			top: table.tableHeight / 2,
			selectable: false,
		}),
	);

	// Seats arranged around the table
	const cx = table.tableWidth / 2;
	const cy = table.tableHeight / 2;
	const padX = table.tableWidth / 2 + table.seatSize + 8;
	const padY = table.tableHeight / 2 + table.seatSize + 8;

	for (let i = 0; i < table.seats.length; i++) {
		const seat = table.seats[i];
		const angle = (2 * Math.PI * i) / table.seats.length - Math.PI / 2;
		const sx = cx + padX * Math.cos(angle) + (seat.offsetX ?? 0);
		const sy = cy + padY * Math.sin(angle) + (seat.offsetY ?? 0);
		const colors = getSeatColor(seat.type);

		if (table.seatShape === "square") {
			const rect = new Rect({
				width: table.seatSize * 2,
				height: table.seatSize * 2,
				fill: colors.fill,
				stroke: colors.stroke,
				strokeWidth: 1,
				left: sx,
				top: sy,
				originX: "center",
				originY: "center",
				rx: 2,
				ry: 2,
				selectable: false,
			});
			(rect as any).seatData = seat;
			objects.push(rect);
		} else {
			const circle = new Circle({
				radius: table.seatSize,
				fill: colors.fill,
				stroke: colors.stroke,
				strokeWidth: 1,
				left: sx,
				top: sy,
				originX: "center",
				originY: "center",
				selectable: false,
			});
			(circle as any).seatData = seat;
			objects.push(circle);
		}

		if (table.seatSize >= 8) {
			objects.push(
				new FabricText(seat.seatName, {
					fontSize: Math.min(7, table.seatSize - 1),
					fontFamily: "sans-serif",
					fill: "#ffffff",
					originX: "center",
					originY: "center",
					left: sx,
					top: sy,
					selectable: false,
				}),
			);
		}
	}

	const group = new Group(objects, {
		left: table.x,
		top: table.y,
		angle: table.angle,
		hasControls: true,
		hasBorders: true,
		borderColor: "#8866cc",
		cornerColor: "#8866cc",
		cornerStyle: "circle",
		transparentCorners: false,
		cornerSize: 12,
		padding: 10,
	});

	(group as any).tableData = table;
	return group;
}

export function buildTableData(
	name: string,
	seatCount: number,
	startSeat: number,
	x: number,
	y: number,
	tableShape: TableData["tableShape"] = "circle",
	tableWidth = 80,
	tableHeight = 80,
	seatShape: TableData["seatShape"] = "circle",
	seatSize = 10,
): TableData {
	const seats: SeatData[] = [];
	for (let i = 0; i < seatCount; i++) {
		seats.push({
			seatId: `${name}-${startSeat + i}`,
			seatName: String(startSeat + i),
			seatOrder: i + 1,
			type: "available",
		});
	}

	return {
		tableId: crypto.randomUUID(),
		tableName: name,
		tableShape,
		tableWidth,
		tableHeight,
		x,
		y,
		angle: 0,
		seats,
		seatShape,
		seatSize,
	};
}

export function extractTableData(group: Group): TableData {
	const data = (group as any).tableData as TableData;
	return {
		...data,
		x: group.left ?? data.x,
		y: group.top ?? data.y,
		angle: group.angle ?? data.angle,
	};
}

export function rebuildTable(canvas: any, oldGroup: Group, newData: TableData): Group {
	canvas.remove(oldGroup);
	const newGroup = createTableGroup(newData);
	canvas.add(newGroup);
	canvas.setActiveObject(newGroup);
	canvas.requestRenderAll();
	return newGroup;
}
