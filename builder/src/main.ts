import { Canvas, Circle, type FabricObject, FabricText, type Group, Point, Rect } from "fabric";
import type { NumberingScheme } from "./numbering";
import { generateSeatNumbers } from "./numbering";
import { getSeatColor } from "./seat-colors";
import {
	buildSectionData,
	createSectionGroup,
	createStage,
	extractSectionData,
	rebuildSection,
} from "./section-builder";
import { buildTableData, createTableGroup, extractTableData, rebuildTable } from "./table-builder";
import type { RowLabelVisibility, SeatShape, SeatType, SectionData, TableData, TableShape, VenueLayout } from "./types";

// --- Canvas setup ---
const canvasEl = document.getElementById("venue-canvas") as HTMLCanvasElement;
const container = document.getElementById("canvas-container") as HTMLDivElement;

const canvas = new Canvas(canvasEl, {
	backgroundColor: "#1a1a2e",
	selection: true,
	preserveObjectStacking: true,
});

function resizeCanvas() {
	canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- Zoom & Pan ---
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

canvas.on("mouse:wheel", (opt) => {
	const e = opt.e as WheelEvent;
	e.preventDefault();
	e.stopPropagation();

	const delta = e.deltaY;
	let zoom = canvas.getZoom();
	zoom *= 0.999 ** delta;
	zoom = Math.min(Math.max(zoom, 0.1), 5);

	canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom);
});

canvas.on("mouse:down", (opt) => {
	const e = opt.e as MouseEvent;
	if (e.altKey || e.button === 1) {
		isPanning = true;
		lastPanX = e.clientX;
		lastPanY = e.clientY;
		canvas.selection = false;
		canvas.setCursor("grabbing");
	}
});

canvas.on("mouse:move", (opt) => {
	if (!isPanning) return;
	const e = opt.e as MouseEvent;
	const vpt = canvas.viewportTransform;
	if (!vpt) return;
	vpt[4] += e.clientX - lastPanX;
	vpt[5] += e.clientY - lastPanY;
	lastPanX = e.clientX;
	lastPanY = e.clientY;
	canvas.requestRenderAll();
});

canvas.on("mouse:up", () => {
	if (isPanning) {
		isPanning = false;
		canvas.selection = true;
		canvas.setCursor("default");
	}
});

// --- State ---
let editingGroup: Group | null = null;
let editingSeatObjects: FabricObject[] = [];
let editingLabelObjects: FabricObject[] = [];
let editingType: "section" | "table" = "section";

// --- Helper ---
const $ = (id: string) => document.getElementById(id)!;

// --- Add section panel ---
const sectionNameInput = $("section-name") as HTMLInputElement;
const sectionRowsInput = $("section-rows") as HTMLInputElement;
const sectionSeatsInput = $("section-seats") as HTMLInputElement;
const startSeatInput = $("section-start-seat") as HTMLInputElement;
const seatShapeSelect = $("seat-shape") as HTMLSelectElement;
const seatSizeInput = $("seat-size") as HTMLInputElement;
const rowSpacingInput = $("row-spacing") as HTMLInputElement;
const seatSpacingInput = $("seat-spacing") as HTMLInputElement;
const numberingSelect = $("numbering") as HTMLSelectElement;
const addSectionBtn = $("add-section") as HTMLButtonElement;

// --- Add table panel ---
const tableNameInput = $("table-name") as HTMLInputElement;
const tableShapeSelect = $("table-shape") as HTMLSelectElement;
const tableWidthInput = $("table-width") as HTMLInputElement;
const tableHeightInput = $("table-height") as HTMLInputElement;
const tableSeatsInput = $("table-seats") as HTMLInputElement;
const tableStartSeatInput = $("table-start-seat") as HTMLInputElement;
const tableSeatShapeSelect = $("table-seat-shape") as HTMLSelectElement;
const tableSeatSizeInput = $("table-seat-size") as HTMLInputElement;
const addTableBtn = $("add-table") as HTMLButtonElement;

// --- Selection panel ---
const selectionPanel = $("selection-panel") as HTMLDivElement;
const selectionInfo = $("selection-info") as HTMLDivElement;
const deleteSectionBtn = $("delete-section") as HTMLButtonElement;
const editSeatsBtn = $("edit-seats") as HTMLButtonElement;
const doneEditingBtn = $("done-editing") as HTMLButtonElement;

// --- Section properties ---
const sectionPropsPanel = $("section-props") as HTMLDivElement;
const propNameInput = $("prop-name") as HTMLInputElement;
const propShapeSelect = $("prop-shape") as HTMLSelectElement;
const propSeatSizeInput = $("prop-seat-size") as HTMLInputElement;
const propRowSpacingInput = $("prop-row-spacing") as HTMLInputElement;
const propSeatSpacingInput = $("prop-seat-spacing") as HTMLInputElement;
const propRowLabelsSelect = $("prop-row-labels") as HTMLSelectElement;
const rowListContainer = $("row-list") as HTMLDivElement;
const addRowBtn = $("add-row") as HTMLButtonElement;

// --- Table properties ---
const tablePropsPanel = $("table-props") as HTMLDivElement;
const tpNameInput = $("tp-name") as HTMLInputElement;
const tpShapeSelect = $("tp-shape") as HTMLSelectElement;
const tpWidthInput = $("tp-width") as HTMLInputElement;
const tpHeightInput = $("tp-height") as HTMLInputElement;
const tpSeatCountInput = $("tp-seat-count") as HTMLInputElement;
const tpSeatShapeSelect = $("tp-seat-shape") as HTMLSelectElement;
const tpSeatSizeInput = $("tp-seat-size") as HTMLInputElement;

// --- Seat properties ---
const seatPropsPanel = $("seat-props") as HTMLDivElement;
const seatPropNameInput = $("seat-prop-name") as HTMLInputElement;
const seatPropTypeSelect = $("seat-prop-type") as HTMLSelectElement;

// --- File ---
const exportBtn = $("export-json") as HTMLButtonElement;
const importBtn = $("import-json") as HTMLButtonElement;
const importFile = $("import-file") as HTMLInputElement;
const addStageBtn = $("add-stage") as HTMLButtonElement;

// =============================================
// ADD SECTION
// =============================================
addSectionBtn.addEventListener("click", () => {
	if (editingGroup) return;
	const name = sectionNameInput.value.trim() || "A";
	const rowCount = Number.parseInt(sectionRowsInput.value) || 8;
	const seatsPerRow = Number.parseInt(sectionSeatsInput.value) || 10;
	const startSeat = Number.parseInt(startSeatInput.value) || 101;
	const shape = seatShapeSelect.value as SeatShape;
	const seatSize = Number.parseInt(seatSizeInput.value) || 10;
	const rSpacing = Number.parseInt(rowSpacingInput.value) || 28;
	const sSpacing = Number.parseInt(seatSpacingInput.value) || 28;

	const numbering = numberingSelect.value as NumberingScheme;
	const rowDefs = [];
	for (let i = 0; i < rowCount; i++) {
		rowDefs.push({ name: String.fromCharCode(65 + i), seatCount: seatsPerRow, startSeat, numbering });
	}

	const x = (canvas.width ?? 800) / 2 - (seatsPerRow * sSpacing) / 2;
	const y = (canvas.height ?? 600) / 2 - (rowCount * rSpacing) / 2;
	const data = buildSectionData(name, rowDefs, x, y, shape, seatSize, rSpacing, sSpacing);
	const group = createSectionGroup(data);
	canvas.add(group);
	canvas.setActiveObject(group);
	canvas.requestRenderAll();

	sectionNameInput.value = String.fromCharCode(name.charCodeAt(0) + 1);
});

// =============================================
// ADD TABLE
// =============================================
addTableBtn.addEventListener("click", () => {
	if (editingGroup) return;
	const name = tableNameInput.value.trim() || "T1";
	const shape = tableShapeSelect.value as TableShape;
	const width = Number.parseInt(tableWidthInput.value) || 80;
	const height = Number.parseInt(tableHeightInput.value) || 80;
	const seatCount = Number.parseInt(tableSeatsInput.value) || 8;
	const startSeat = Number.parseInt(tableStartSeatInput.value) || 1;
	const seatShape = tableSeatShapeSelect.value as SeatShape;
	const seatSize = Number.parseInt(tableSeatSizeInput.value) || 10;

	const x = (canvas.width ?? 800) / 2 - width / 2;
	const y = (canvas.height ?? 600) / 2 - height / 2;
	const data = buildTableData(name, seatCount, startSeat, x, y, shape, width, height, seatShape, seatSize);
	const group = createTableGroup(data);
	canvas.add(group);
	canvas.setActiveObject(group);
	canvas.requestRenderAll();

	// Auto-increment name
	const match = name.match(/^(\D*)(\d+)$/);
	if (match) tableNameInput.value = `${match[1]}${Number.parseInt(match[2]) + 1}`;
});

// =============================================
// ADD STAGE
// =============================================
addStageBtn.addEventListener("click", () => {
	if (editingGroup) return;
	const cx = (canvas.width ?? 800) / 2 - 150;
	canvas.add(createStage(cx, 60));
	canvas.requestRenderAll();
});

// =============================================
// SELECTION
// =============================================
canvas.on("selection:created", updateSelection);
canvas.on("selection:updated", updateSelection);
canvas.on("selection:cleared", clearSelection);
canvas.on("object:modified", updateSelection);

function clearSelection() {
	selectionInfo.textContent = "No section selected";
	deleteSectionBtn.disabled = true;
	editSeatsBtn.disabled = true;
	sectionPropsPanel.classList.add("hidden");
	tablePropsPanel.classList.add("hidden");
	seatPropsPanel.classList.add("hidden");
	rowActionsPanel.classList.add("hidden");
	selectedRowIndex = -1;

	// Don't strip editing state while in edit mode
	if (!editingGroup) {
		selectionPanel.classList.remove("editing");
	}
}

function updateSelection() {
	const active = canvas.getActiveObject();
	if (!active) return;

	sectionPropsPanel.classList.add("hidden");
	tablePropsPanel.classList.add("hidden");
	seatPropsPanel.classList.add("hidden");

	// Stage
	if ((active as any).isStage) {
		selectionInfo.textContent = "Stage — drag to reposition";
		deleteSectionBtn.disabled = false;
		editSeatsBtn.disabled = true;
		return;
	}

	// Edit-mode seat
	if ((active as any).seatRef) {
		showSeatProps(active);
		return;
	}

	// Section
	const sectionData = (active as any).sectionData as SectionData | undefined;
	if (sectionData) {
		const totalSeats = sectionData.rows.reduce((sum, r) => sum + r.seats.length, 0);
		selectionInfo.innerHTML = `<strong>Section ${sectionData.sectionName}</strong> — ${sectionData.rows.length} rows, ${totalSeats} seats, ${Math.round(active.angle ?? 0)}°`;
		deleteSectionBtn.disabled = false;
		editSeatsBtn.disabled = false;
		showSectionProps(sectionData, active as Group);
		return;
	}

	// Table
	const tableData = (active as any).tableData as TableData | undefined;
	if (tableData) {
		selectionInfo.innerHTML = `<strong>Table ${tableData.tableName}</strong> — ${tableData.seats.length} seats, ${Math.round(active.angle ?? 0)}°`;
		deleteSectionBtn.disabled = false;
		editSeatsBtn.disabled = false;
		showTableProps(tableData, active as Group);
	}
}

// =============================================
// SECTION PROPERTIES
// =============================================
function showSectionProps(data: SectionData, group: Group) {
	sectionPropsPanel.classList.remove("hidden");
	propNameInput.value = data.sectionName;
	propShapeSelect.value = data.seatShape;
	propSeatSizeInput.value = String(data.seatSize);
	propRowSpacingInput.value = String(data.rowSpacing);
	propSeatSpacingInput.value = String(data.seatSpacing);
	propRowLabelsSelect.value = data.rowLabelVisibility ?? "both";
	renderRowList(data, group);
}

function applySectionPropChange() {
	const active = canvas.getActiveObject() as Group | null;
	if (!active || !(active as any).sectionData) return;

	const data = extractSectionData(active);
	data.sectionName = propNameInput.value.trim() || data.sectionName;
	data.seatShape = propShapeSelect.value as SeatShape;
	data.seatSize = Number.parseInt(propSeatSizeInput.value) || data.seatSize;
	data.rowSpacing = Number.parseInt(propRowSpacingInput.value) || data.rowSpacing;
	data.seatSpacing = Number.parseInt(propSeatSpacingInput.value) || data.seatSpacing;
	data.rowLabelVisibility = propRowLabelsSelect.value as RowLabelVisibility;

	rebuildSection(canvas, active, data);
	updateSelection();
}

for (const el of [propNameInput, propSeatSizeInput, propRowSpacingInput, propSeatSpacingInput]) {
	el.addEventListener("change", applySectionPropChange);
}
propShapeSelect.addEventListener("change", applySectionPropChange);
propRowLabelsSelect.addEventListener("change", applySectionPropChange);

// =============================================
// ROW LIST
// =============================================
function detectNumbering(row: SectionData["rows"][number]): NumberingScheme {
	if (row.seats.length < 2) return "ascending";
	const first = Number.parseInt(row.seats[0].seatName) || 0;
	const second = Number.parseInt(row.seats[1].seatName) || 0;
	const diff = second - first;
	if (diff === 1) return "ascending";
	if (diff === -1) return "descending";
	if (diff === 2 && first % 2 === 1) return "odd-ascending";
	if (diff === -2 && first % 2 === 1) return "odd-descending";
	if (diff === 2 && first % 2 === 0) return "even-ascending";
	if (diff === -2 && first % 2 === 0) return "even-descending";
	return "ascending";
}

function renderRowList(data: SectionData, group: Group) {
	rowListContainer.innerHTML = "";

	for (let r = 0; r < data.rows.length; r++) {
		const row = data.rows[r];
		const detected = detectNumbering(row);
		const firstSeat = row.seats[0]?.seatName ?? "1";

		const rowEl = document.createElement("div");
		rowEl.className = "row-editor-v2";
		rowEl.innerHTML = `
			<div class="row-editor-top">
				<input type="text" class="row-name-input" value="${row.rowName}" title="Row name" />
				<input type="number" class="row-seats-input" value="${row.seats.length}" min="1" max="50" title="Seat count" />
				<input type="number" class="row-start-input" value="${firstSeat}" title="Start seat #" />
				<button class="row-delete-btn" title="Remove row">×</button>
			</div>
			<select class="row-numbering-select" title="Numbering">
				<option value="ascending" ${detected === "ascending" ? "selected" : ""}>1, 2, 3...</option>
				<option value="descending" ${detected === "descending" ? "selected" : ""}>10, 9, 8...</option>
				<option value="odd-ascending" ${detected === "odd-ascending" ? "selected" : ""}>1, 3, 5...</option>
				<option value="odd-descending" ${detected === "odd-descending" ? "selected" : ""}>7, 5, 3, 1</option>
				<option value="even-ascending" ${detected === "even-ascending" ? "selected" : ""}>2, 4, 6...</option>
				<option value="even-descending" ${detected === "even-descending" ? "selected" : ""}>8, 6, 4, 2</option>
			</select>
		`;

		const nameInput = rowEl.querySelector(".row-name-input") as HTMLInputElement;
		const seatsInput = rowEl.querySelector(".row-seats-input") as HTMLInputElement;
		const startInput = rowEl.querySelector(".row-start-input") as HTMLInputElement;
		const numberingSelect = rowEl.querySelector(".row-numbering-select") as HTMLSelectElement;
		const deleteBtn = rowEl.querySelector(".row-delete-btn") as HTMLButtonElement;

		const applyRowChange = () => {
			const current = extractSectionData(group);
			const rowData = current.rows[r];
			if (!rowData) return;
			rowData.rowName = nameInput.value.trim() || rowData.rowName;
			rowData.rowId = `${current.sectionName}-${rowData.rowName}`;
			const newCount = Number.parseInt(seatsInput.value) || rowData.seats.length;
			const newStart = Number.parseInt(startInput.value) || 1;
			const scheme = numberingSelect.value as NumberingScheme;
			const seatNames = generateSeatNumbers(newCount, newStart, scheme);
			const newSeats = seatNames.map((seatName, s) => {
				const existing = rowData.seats[s];
				return {
					seatId: `${current.sectionName}-${rowData.rowName}-${seatName}`,
					seatName,
					seatOrder: s + 1,
					type: existing?.type ?? ("available" as const),
					offsetX: existing?.offsetX,
					offsetY: existing?.offsetY,
				};
			});
			rowData.seats = newSeats;
			const newGroup = rebuildSection(canvas, group, current);
			group = newGroup;
			updateSelection();
		};

		nameInput.addEventListener("change", applyRowChange);
		seatsInput.addEventListener("change", applyRowChange);
		startInput.addEventListener("change", applyRowChange);
		numberingSelect.addEventListener("change", applyRowChange);
		deleteBtn.addEventListener("click", () => {
			if (data.rows.length <= 1) return;
			const current = extractSectionData(group);
			current.rows.splice(r, 1);
			const newGroup = rebuildSection(canvas, group, current);
			group = newGroup;
			updateSelection();
		});

		rowListContainer.appendChild(rowEl);
	}
}

addRowBtn.addEventListener("click", () => {
	const active = canvas.getActiveObject() as Group | null;
	if (!active || !(active as any).sectionData) return;
	const data = extractSectionData(active);
	const lastRow = data.rows[data.rows.length - 1];
	const nextName = String.fromCharCode(lastRow.rowName.charCodeAt(0) + 1);
	const seatCount = lastRow?.seats.length ?? 10;
	const startSeat = Number.parseInt(lastRow?.seats[0]?.seatName ?? "101") || 101;
	data.rows.push({
		rowId: `${data.sectionName}-${nextName}`,
		rowName: nextName,
		rowNumber: data.rows.length + 1,
		seats: Array.from({ length: seatCount }, (_, s) => ({
			seatId: `${data.sectionName}-${nextName}-${startSeat + s}`,
			seatName: String(startSeat + s),
			seatOrder: s + 1,
			type: "available" as const,
		})),
	});
	rebuildSection(canvas, active, data);
	updateSelection();
});

// =============================================
// TABLE PROPERTIES
// =============================================
function showTableProps(data: TableData, _group: Group) {
	tablePropsPanel.classList.remove("hidden");
	tpNameInput.value = data.tableName;
	tpShapeSelect.value = data.tableShape;
	tpWidthInput.value = String(data.tableWidth);
	tpHeightInput.value = String(data.tableHeight);
	tpSeatCountInput.value = String(data.seats.length);
	tpSeatShapeSelect.value = data.seatShape;
	tpSeatSizeInput.value = String(data.seatSize);
}

function applyTablePropChange() {
	const active = canvas.getActiveObject() as Group | null;
	if (!active || !(active as any).tableData) return;
	const data = extractTableData(active);

	data.tableName = tpNameInput.value.trim() || data.tableName;
	data.tableShape = tpShapeSelect.value as TableShape;
	data.tableWidth = Number.parseInt(tpWidthInput.value) || data.tableWidth;
	data.tableHeight = Number.parseInt(tpHeightInput.value) || data.tableHeight;
	data.seatShape = tpSeatShapeSelect.value as SeatShape;
	data.seatSize = Number.parseInt(tpSeatSizeInput.value) || data.seatSize;

	const newCount = Number.parseInt(tpSeatCountInput.value) || data.seats.length;
	if (newCount !== data.seats.length) {
		const startSeat = Number.parseInt(data.seats[0]?.seatName ?? "1") || 1;
		data.seats = Array.from({ length: newCount }, (_, i) => {
			const existing = data.seats[i];
			return (
				existing ?? {
					seatId: `${data.tableName}-${startSeat + i}`,
					seatName: String(startSeat + i),
					seatOrder: i + 1,
					type: "available" as const,
				}
			);
		});
	}

	rebuildTable(canvas, active, data);
	updateSelection();
}

for (const el of [tpNameInput, tpWidthInput, tpHeightInput, tpSeatCountInput, tpSeatSizeInput]) {
	el.addEventListener("change", applyTablePropChange);
}
tpShapeSelect.addEventListener("change", applyTablePropChange);
tpSeatShapeSelect.addEventListener("change", applyTablePropChange);

// =============================================
// SEAT PROPERTIES (edit mode)
// =============================================
function showSeatProps(obj: FabricObject) {
	const ref = (obj as any).seatRef as { rowIndex: number; seatIndex: number } | undefined;
	if (!ref || !editingGroup) return;

	seatPropsPanel.classList.remove("hidden");
	rowActionsPanel.classList.add("hidden");

	let seat: any;
	if (editingType === "section") {
		const data = (editingGroup as any).sectionData as SectionData;
		seat = data.rows[ref.rowIndex]?.seats[ref.seatIndex];
	} else {
		const data = (editingGroup as any).tableData as TableData;
		seat = data.seats[ref.seatIndex];
	}
	if (!seat) return;

	seatPropNameInput.value = seat.seatName;
	seatPropTypeSelect.value = seat.type;

	let rowInfo = "";
	if (editingType === "section") {
		const data = (editingGroup as any).sectionData as SectionData;
		const row = data.rows[ref.rowIndex];
		if (row) rowInfo = ` — Row ${row.rowName}`;
	}

	selectionInfo.innerHTML = `<strong>Seat ${seat.seatName}</strong>${rowInfo} — ${seat.type}`;
	deleteSectionBtn.disabled = false;
}

seatPropNameInput.addEventListener("change", () => {
	const active = canvas.getActiveObject();
	if (!active || !(active as any).seatRef || !editingGroup) return;
	const ref = (active as any).seatRef;

	const newName = seatPropNameInput.value;
	if (editingType === "section") {
		const data = (editingGroup as any).sectionData as SectionData;
		const seat = data.rows[ref.rowIndex]?.seats[ref.seatIndex];
		if (seat) seat.seatName = newName;
	} else {
		const data = (editingGroup as any).tableData as TableData;
		const seat = data.seats[ref.seatIndex];
		if (seat) seat.seatName = newName;
	}

	// Update the visible label on the canvas
	for (const label of editingLabelObjects) {
		if ((label as any).seatLabelFor === active && label instanceof FabricText) {
			label.set({ text: newName });
			canvas.requestRenderAll();
			break;
		}
	}
});

seatPropTypeSelect.addEventListener("change", () => {
	const active = canvas.getActiveObject();
	if (!active || !(active as any).seatRef || !editingGroup) return;
	const ref = (active as any).seatRef;
	const newType = seatPropTypeSelect.value as SeatType;

	let seat: any;
	if (editingType === "section") {
		const data = (editingGroup as any).sectionData as SectionData;
		seat = data.rows[ref.rowIndex]?.seats[ref.seatIndex];
	} else {
		const data = (editingGroup as any).tableData as TableData;
		seat = data.seats[ref.seatIndex];
	}
	if (!seat) return;

	seat.type = newType;
	const colors = getSeatColor(newType);

	// Update the visual
	if (active instanceof Circle) {
		active.set({ fill: colors.fill, stroke: colors.stroke });
	} else if (active instanceof Rect) {
		active.set({ fill: colors.fill, stroke: colors.stroke });
	}
	canvas.requestRenderAll();
	selectionInfo.innerHTML = `<strong>Seat ${seat.seatName}</strong> — ${newType}`;
});

// =============================================
// EDIT SEATS MODE
// =============================================
editSeatsBtn.addEventListener("click", () => {
	const active = canvas.getActiveObject() as Group | null;
	if (!active) return;

	if ((active as any).sectionData) {
		editingType = "section";
		enterEditMode(active, extractSectionData(active));
	} else if ((active as any).tableData) {
		editingType = "table";
		enterEditMode(active, extractTableData(active));
	}
});

doneEditingBtn.addEventListener("click", exitEditMode);

function enterEditMode(group: Group, data: SectionData | TableData) {
	editingGroup = group;
	editingSeatObjects = [];
	group.visible = false;
	canvas.discardActiveObject();

	const groupLeft = group.left ?? 0;
	const groupTop = group.top ?? 0;
	const angleRad = ((group.angle ?? 0) * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	const seatPositions: { localX: number; localY: number; seat: any; rowIndex: number; seatIndex: number }[] = [];

	if ("rows" in data) {
		const maxSeats = Math.max(...data.rows.map((r) => r.seats.length), 1);
		for (let r = 0; r < data.rows.length; r++) {
			const row = data.rows[r];
			const rowWidth = row.seats.length * data.seatSpacing;
			const maxWidth = maxSeats * data.seatSpacing;
			const rowOffsetX = (maxWidth - rowWidth) / 2;
			for (let s = 0; s < row.seats.length; s++) {
				const seat = row.seats[s];
				seatPositions.push({
					localX: 30 + rowOffsetX + s * data.seatSpacing + (seat.offsetX ?? 0),
					localY: r * data.rowSpacing + (seat.offsetY ?? 0),
					seat,
					rowIndex: r,
					seatIndex: s,
				});
			}
		}
	} else {
		const cx = data.tableWidth / 2;
		const cy = data.tableHeight / 2;
		const padX = data.tableWidth / 2 + data.seatSize + 8;
		const padY = data.tableHeight / 2 + data.seatSize + 8;
		for (let i = 0; i < data.seats.length; i++) {
			const seat = data.seats[i];
			const a = (2 * Math.PI * i) / data.seats.length - Math.PI / 2;
			seatPositions.push({
				localX: cx + padX * Math.cos(a) + (seat.offsetX ?? 0),
				localY: cy + padY * Math.sin(a) + (seat.offsetY ?? 0),
				seat,
				rowIndex: 0,
				seatIndex: i,
			});
		}
	}

	const seatShape = "rows" in data ? data.seatShape : data.seatShape;
	const seatSize = "rows" in data ? data.seatSize : data.seatSize;

	// Add row labels (for sections)
	if ("rows" in data) {
		const maxSeats = Math.max(...data.rows.map((r) => r.seats.length), 1);
		for (let r = 0; r < data.rows.length; r++) {
			const row = data.rows[r];
			const localY = r * data.rowSpacing;

			// Left row label
			const leftLocalX = -5;
			const lx = groupLeft + leftLocalX * cos - localY * sin;
			const ly = groupTop + leftLocalX * sin + localY * cos;
			const leftLabel = new FabricText(row.rowName, {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: "#ffcc00",
				fontWeight: "bold",
				originX: "center",
				originY: "center",
				left: lx,
				top: ly,
				hasControls: false,
				hasBorders: true,
				borderColor: "#ffcc00",
				selectable: true,
			});
			(leftLabel as any).rowLabelRef = { rowIndex: r, side: "left" };
			editingLabelObjects.push(leftLabel);
			canvas.add(leftLabel);

			// Right row label
			const rowWidth = row.seats.length * data.seatSpacing;
			const maxWidth = maxSeats * data.seatSpacing;
			const rowOffsetX = (maxWidth - rowWidth) / 2;
			const rightLocalX = 30 + rowOffsetX + row.seats.length * data.seatSpacing + 15;
			const rx = groupLeft + rightLocalX * cos - localY * sin;
			const ry = groupTop + rightLocalX * sin + localY * cos;
			const rightLabel = new FabricText(row.rowName, {
				fontSize: 12,
				fontFamily: "sans-serif",
				fill: "#ffcc00",
				fontWeight: "bold",
				originX: "center",
				originY: "center",
				left: rx,
				top: ry,
				hasControls: false,
				hasBorders: true,
				borderColor: "#ffcc00",
				selectable: true,
			});
			(rightLabel as any).rowLabelRef = { rowIndex: r, side: "right" };
			editingLabelObjects.push(rightLabel);
			canvas.add(rightLabel);
		}
	}

	for (const pos of seatPositions) {
		const cx = groupLeft + pos.localX * cos - pos.localY * sin;
		const cy = groupTop + pos.localX * sin + pos.localY * cos;
		const colors = getSeatColor(pos.seat.type);

		let obj: FabricObject;
		if (seatShape === "square") {
			obj = new Rect({
				width: seatSize * 2,
				height: seatSize * 2,
				fill: colors.fill,
				stroke: colors.stroke,
				strokeWidth: 1,
				left: cx,
				top: cy,
				originX: "center",
				originY: "center",
				rx: 2,
				ry: 2,
				hasControls: false,
				hasBorders: true,
				borderColor: "#ffffff",
			});
		} else {
			obj = new Circle({
				radius: seatSize,
				fill: colors.fill,
				stroke: colors.stroke,
				strokeWidth: 1,
				left: cx,
				top: cy,
				originX: "center",
				originY: "center",
				hasControls: false,
				hasBorders: true,
				borderColor: "#ffffff",
			});
		}

		(obj as any).seatRef = { rowIndex: pos.rowIndex, seatIndex: pos.seatIndex };
		editingSeatObjects.push(obj);
		canvas.add(obj);

		// Seat number label (non-selectable, follows the seat)
		if (seatSize >= 8) {
			const seatLabel = new FabricText(pos.seat.seatName, {
				fontSize: Math.min(7, seatSize - 1),
				fontFamily: "sans-serif",
				fill: "#ffffff",
				originX: "center",
				originY: "center",
				left: cx,
				top: cy,
				selectable: false,
				evented: false,
			});
			(seatLabel as any).seatLabelFor = obj;
			editingLabelObjects.push(seatLabel);
			canvas.add(seatLabel);
		}
	}

	// Keep seat number labels following their seats when dragged
	canvas.on("object:moving", onEditSeatMoving);

	selectionPanel.classList.add("editing");
	sectionPropsPanel.classList.add("hidden");
	tablePropsPanel.classList.add("hidden");
	canvas.requestRenderAll();
}

function onEditSeatMoving(e: any) {
	const target = e.target;
	if (!target || !(target as any).seatRef) return;

	// Find the label that tracks this seat
	for (const label of editingLabelObjects) {
		if ((label as any).seatLabelFor === target) {
			label.set({ left: target.left, top: target.top });
			label.setCoords();
			break;
		}
	}
}

// =============================================
// ROW SELECTION & ALIGNMENT (edit mode)
// =============================================
const rowActionsPanel = $("row-actions") as HTMLDivElement;
const rowActionName = $("row-action-name") as HTMLSpanElement;
const rowActionInfo = $("row-action-info") as HTMLDivElement;
let selectedRowIndex = -1;

// Clicking a row label selects all seats in that row
canvas.on("selection:created", checkRowLabelSelection);
canvas.on("selection:updated", checkRowLabelSelection);

function checkRowLabelSelection() {
	const active = canvas.getActiveObject();
	if (!active || !(active as any).rowLabelRef) {
		rowActionsPanel.classList.add("hidden");
		return;
	}

	const ref = (active as any).rowLabelRef as { rowIndex: number; side: string };
	selectedRowIndex = ref.rowIndex;

	if (!editingGroup) return;

	let rowName = "";
	let seatCount = 0;
	if (editingType === "section") {
		const data = (editingGroup as any).sectionData as SectionData;
		const row = data.rows[ref.rowIndex];
		if (row) {
			rowName = row.rowName;
			seatCount = row.seats.length;
		}
	}

	rowActionName.textContent = rowName;
	rowActionInfo.textContent = `${seatCount} seats — click seats to select individually`;
	rowActionsPanel.classList.remove("hidden");
	seatPropsPanel.classList.add("hidden");
	deleteSectionBtn.disabled = false;
	selectionInfo.innerHTML = `<strong>Row ${rowName}</strong> — ${seatCount} seats`;
}

function getSeatsInRow(rowIndex: number): FabricObject[] {
	return editingSeatObjects.filter((obj) => {
		const ref = (obj as any).seatRef;
		return ref && ref.rowIndex === rowIndex;
	});
}

function getLabelsInRow(rowIndex: number): FabricObject[] {
	return editingLabelObjects.filter((obj) => {
		const ref = (obj as any).seatLabelFor;
		if (ref) {
			const seatRef = (ref as any).seatRef;
			return seatRef && seatRef.rowIndex === rowIndex;
		}
		return false;
	});
}

/** Convert canvas coords to local (group-relative) coords, accounting for rotation */
function canvasToLocal(cx: number, cy: number): { lx: number; ly: number } {
	if (!editingGroup) return { lx: cx, ly: cy };
	const gx = editingGroup.left ?? 0;
	const gy = editingGroup.top ?? 0;
	const angleRad = (-(editingGroup.angle ?? 0) * Math.PI) / 180;
	const dx = cx - gx;
	const dy = cy - gy;
	return {
		lx: dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
		ly: dx * Math.sin(angleRad) + dy * Math.cos(angleRad),
	};
}

/** Convert local (group-relative) shift to canvas-space shift, accounting for rotation */
function localShiftToCanvas(dlx: number, dly: number): { dx: number; dy: number } {
	if (!editingGroup) return { dx: dlx, dy: dly };
	const angleRad = ((editingGroup.angle ?? 0) * Math.PI) / 180;
	return {
		dx: dlx * Math.cos(angleRad) - dly * Math.sin(angleRad),
		dy: dlx * Math.sin(angleRad) + dly * Math.cos(angleRad),
	};
}

function shiftObjects(objects: FabricObject[], dx: number, dy: number) {
	for (const obj of objects) {
		obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
		obj.setCoords();
	}
}

function syncSeatLabels(rowIndex: number) {
	for (const label of editingLabelObjects) {
		const parent = (label as any).seatLabelFor;
		if (parent && (parent as any).seatRef?.rowIndex === rowIndex) {
			label.set({ left: parent.left, top: parent.top });
			label.setCoords();
		}
	}
}

function alignRow(direction: "left" | "center" | "right") {
	if (selectedRowIndex < 0 || !editingGroup || editingType !== "section") return;

	const seats = getSeatsInRow(selectedRowIndex);
	if (seats.length === 0) return;

	// Work in local (rotation-independent) space
	let globalMinLX = Infinity;
	let globalMaxLX = -Infinity;
	for (const obj of editingSeatObjects) {
		const { lx } = canvasToLocal(obj.left ?? 0, obj.top ?? 0);
		globalMinLX = Math.min(globalMinLX, lx);
		globalMaxLX = Math.max(globalMaxLX, lx);
	}

	let rowMinLX = Infinity;
	let rowMaxLX = -Infinity;
	for (const s of seats) {
		const { lx } = canvasToLocal(s.left ?? 0, s.top ?? 0);
		rowMinLX = Math.min(rowMinLX, lx);
		rowMaxLX = Math.max(rowMaxLX, lx);
	}

	const rowWidth = rowMaxLX - rowMinLX;
	const globalWidth = globalMaxLX - globalMinLX;
	let localShiftX = 0;

	if (direction === "left") {
		localShiftX = globalMinLX - rowMinLX;
	} else if (direction === "right") {
		localShiftX = globalMaxLX - rowMaxLX;
	} else {
		localShiftX = globalMinLX + globalWidth / 2 - (rowMinLX + rowWidth / 2);
	}

	// Convert local X shift to canvas coords
	const { dx, dy } = localShiftToCanvas(localShiftX, 0);
	shiftObjects(seats, dx, dy);
	syncSeatLabels(selectedRowIndex);

	canvas.requestRenderAll();
}

function nudgeRow(localDx: number, localDy: number) {
	if (selectedRowIndex < 0) return;

	// Convert local nudge direction to canvas coords
	const { dx, dy } = localShiftToCanvas(localDx, localDy);

	const seats = getSeatsInRow(selectedRowIndex);
	shiftObjects(seats, dx, dy);
	syncSeatLabels(selectedRowIndex);

	// Also move the row labels themselves
	for (const label of editingLabelObjects) {
		const ref = (label as any).rowLabelRef;
		if (ref && ref.rowIndex === selectedRowIndex) {
			label.set({ left: (label.left ?? 0) + dx, top: (label.top ?? 0) + dy });
			label.setCoords();
		}
	}

	canvas.requestRenderAll();
}

$("row-align-left").addEventListener("click", () => alignRow("left"));
$("row-align-center").addEventListener("click", () => alignRow("center"));
$("row-align-right").addEventListener("click", () => alignRow("right"));
$("row-nudge-left").addEventListener("click", () => nudgeRow(-5, 0));
$("row-nudge-right").addEventListener("click", () => nudgeRow(5, 0));
$("row-nudge-up").addEventListener("click", () => nudgeRow(0, -5));
$("row-nudge-down").addEventListener("click", () => nudgeRow(0, 5));

function exitEditMode() {
	if (!editingGroup) return;

	const groupLeft = editingGroup.left ?? 0;
	const groupTop = editingGroup.top ?? 0;
	const angleRad = (-(editingGroup.angle ?? 0) * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	if (editingType === "section") {
		const data = extractSectionData(editingGroup);
		const maxSeats = Math.max(...data.rows.map((r) => r.seats.length), 1);

		for (const obj of editingSeatObjects) {
			const ref = (obj as any).seatRef;
			const row = data.rows[ref.rowIndex];
			const seat = row?.seats[ref.seatIndex];
			if (!seat) continue;

			const dx = (obj.left ?? 0) - groupLeft;
			const dy = (obj.top ?? 0) - groupTop;
			const localX = dx * cos - dy * sin;
			const localY = dx * sin + dy * cos;
			const rowWidth = row.seats.length * data.seatSpacing;
			const maxWidth = maxSeats * data.seatSpacing;
			const rowOffsetX = (maxWidth - rowWidth) / 2;
			seat.offsetX = localX - (30 + rowOffsetX + ref.seatIndex * data.seatSpacing);
			seat.offsetY = localY - ref.rowIndex * data.rowSpacing;
			canvas.remove(obj);
		}

		canvas.remove(editingGroup);
		const newGroup = createSectionGroup(data);
		canvas.add(newGroup);
		canvas.setActiveObject(newGroup);
	} else {
		const data = extractTableData(editingGroup);
		const cx = data.tableWidth / 2;
		const cy = data.tableHeight / 2;
		const padX = data.tableWidth / 2 + data.seatSize + 8;
		const padY = data.tableHeight / 2 + data.seatSize + 8;

		for (const obj of editingSeatObjects) {
			const ref = (obj as any).seatRef;
			const seat = data.seats[ref.seatIndex];
			if (!seat) continue;

			const dx = (obj.left ?? 0) - groupLeft;
			const dy = (obj.top ?? 0) - groupTop;
			const localX = dx * cos - dy * sin;
			const localY = dx * sin + dy * cos;
			const a = (2 * Math.PI * ref.seatIndex) / data.seats.length - Math.PI / 2;
			seat.offsetX = localX - (cx + padX * Math.cos(a));
			seat.offsetY = localY - (cy + padY * Math.sin(a));
			canvas.remove(obj);
		}

		canvas.remove(editingGroup);
		const newGroup = createTableGroup(data);
		canvas.add(newGroup);
		canvas.setActiveObject(newGroup);
	}

	// Remove all label objects
	for (const label of editingLabelObjects) canvas.remove(label);
	editingLabelObjects = [];

	editingSeatObjects = [];
	editingGroup = null;
	selectionPanel.classList.remove("editing");
	seatPropsPanel.classList.add("hidden");
	canvas.off("object:moving", onEditSeatMoving);
	canvas.requestRenderAll();
	updateSelection();
}

// =============================================
// DELETE
// =============================================
deleteSectionBtn.addEventListener("click", () => {
	const active = canvas.getActiveObject();
	if (!active) return;

	// Delete a seat in edit mode
	if (editingGroup && (active as any).seatRef) {
		const ref = (active as any).seatRef as { rowIndex: number; seatIndex: number };

		// Remove from data model
		if (editingType === "section") {
			const data = (editingGroup as any).sectionData as SectionData;
			const row = data.rows[ref.rowIndex];
			if (row) row.seats.splice(ref.seatIndex, 1);
		} else {
			const data = (editingGroup as any).tableData as TableData;
			data.seats.splice(ref.seatIndex, 1);
		}

		// Remove the seat object and its label from canvas
		const labelToRemove = editingLabelObjects.find((l) => (l as any).seatLabelFor === active);
		if (labelToRemove) {
			canvas.remove(labelToRemove);
			editingLabelObjects = editingLabelObjects.filter((l) => l !== labelToRemove);
		}
		canvas.remove(active);
		editingSeatObjects = editingSeatObjects.filter((o) => o !== active);

		// Re-index seatRefs for remaining seats in affected row
		for (const obj of editingSeatObjects) {
			const r = (obj as any).seatRef;
			if (r && r.rowIndex === ref.rowIndex && r.seatIndex > ref.seatIndex) {
				r.seatIndex--;
			}
		}

		canvas.discardActiveObject();
		canvas.requestRenderAll();
		seatPropsPanel.classList.add("hidden");
		return;
	}

	// Delete a row label in edit mode — persists to row data
	if (editingGroup && (active as any).rowLabelRef) {
		const labelRef = (active as any).rowLabelRef as { rowIndex: number; side: string };

		if (editingType === "section") {
			const data = (editingGroup as any).sectionData as SectionData;
			const row = data.rows[labelRef.rowIndex];
			if (row) {
				const current = row.labelSide ?? data.rowLabelVisibility ?? "both";
				if (labelRef.side === "left") {
					row.labelSide = current === "both" ? "right" : "none";
				} else {
					row.labelSide = current === "both" ? "left" : "none";
				}
			}
		}

		canvas.remove(active);
		editingLabelObjects = editingLabelObjects.filter((l) => l !== active);
		canvas.discardActiveObject();
		canvas.requestRenderAll();
		rowActionsPanel.classList.add("hidden");
		return;
	}

	// Delete section/table/stage (normal mode)
	canvas.remove(active);
	canvas.discardActiveObject();
	canvas.requestRenderAll();
	clearSelection();
});

// =============================================
// KEYBOARD
// =============================================
document.addEventListener("keydown", (e) => {
	const tag = (e.target as HTMLElement).tagName;
	if (tag === "INPUT" || tag === "SELECT") return;
	if (e.key === "Delete" || e.key === "Backspace") deleteSectionBtn.click();
	if (e.key === "Escape" && editingGroup) exitEditMode();
});

// =============================================
// EXPORT / IMPORT
// =============================================
exportBtn.addEventListener("click", () => {
	const layout = buildVenueLayout();
	const json = JSON.stringify(layout, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "venue-layout.json";
	a.click();
	URL.revokeObjectURL(url);
});

function buildVenueLayout(): VenueLayout {
	const sections: VenueLayout["sections"] = [];
	const tables: VenueLayout["tables"] = [];
	let stage: VenueLayout["stage"] | undefined;

	for (const obj of canvas.getObjects()) {
		if ((obj as any).isStage) {
			stage = { x: obj.left ?? 0, y: obj.top ?? 0, width: obj.width ?? 300, height: obj.height ?? 60 };
		} else if ((obj as any).sectionData) {
			sections.push(extractSectionData(obj as Group));
		} else if ((obj as any).tableData) {
			tables.push(extractTableData(obj as Group));
		}
	}

	return { name: "New Venue", sections, tables, stage };
}

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
	const file = importFile.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		try {
			loadVenueLayout(JSON.parse(reader.result as string) as VenueLayout);
		} catch {
			alert("Invalid JSON file");
		}
	};
	reader.readAsText(file);
	importFile.value = "";
});

function loadVenueLayout(layout: VenueLayout) {
	canvas.clear();
	canvas.backgroundColor = "#1a1a2e";
	if (layout.stage) canvas.add(createStage(layout.stage.x, layout.stage.y, layout.stage.width, layout.stage.height));
	for (const section of layout.sections) canvas.add(createSectionGroup(section));
	for (const table of layout.tables ?? []) canvas.add(createTableGroup(table));
	canvas.requestRenderAll();
}
