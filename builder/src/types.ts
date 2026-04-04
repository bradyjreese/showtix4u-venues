export type SeatShape = "circle" | "square";
export type TableShape = "circle" | "square" | "oval" | "rectangle";
export type SeatType = "available" | "wheelchair" | "handicap" | "companion" | "obstructed" | "unavailable" | "empty";

export interface SeatData {
	seatId: string;
	seatName: string;
	seatOrder: number;
	type: SeatType;
	/** Manual offset from grid position */
	offsetX?: number;
	offsetY?: number;
}

export type RowLabelSide = "both" | "left" | "right" | "none";

export interface RowData {
	rowId: string;
	rowName: string;
	rowNumber: number;
	seats: SeatData[];
	/** Per-row label visibility override (defaults to section setting) */
	labelSide?: RowLabelSide;
}

export type RowLabelVisibility = "both" | "left" | "right" | "none";

export interface SectionData {
	sectionId: string;
	sectionName: string;
	rows: RowData[];
	x: number;
	y: number;
	angle: number;
	seatShape: SeatShape;
	seatSize: number;
	rowSpacing: number;
	seatSpacing: number;
	rowLabelVisibility?: RowLabelVisibility;
}

export interface TableData {
	tableId: string;
	tableName: string;
	tableShape: TableShape;
	tableWidth: number;
	tableHeight: number;
	x: number;
	y: number;
	angle: number;
	seats: SeatData[];
	seatShape: SeatShape;
	seatSize: number;
}

export interface VenueLayout {
	name: string;
	sections: SectionData[];
	tables: TableData[];
	stage?: { x: number; y: number; width: number; height: number };
}
