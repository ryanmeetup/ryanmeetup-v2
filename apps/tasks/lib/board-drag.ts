const dragScrollEdgeSize = 96;
const dragScrollMaxSpeed = 18;

export function boardDragScrollSpeed(
  position: number,
  start: number,
  end: number,
) {
  const distanceFromStart = position - start;
  const distanceFromEnd = end - position;
  const edgeIntensity = (distance: number) =>
    Math.min(1, Math.max(0, 1 - distance / dragScrollEdgeSize));

  if (distanceFromStart < dragScrollEdgeSize)
    return -dragScrollMaxSpeed * edgeIntensity(distanceFromStart);
  if (distanceFromEnd < dragScrollEdgeSize)
    return dragScrollMaxSpeed * edgeIntensity(distanceFromEnd);
  return 0;
}

export type BoardDragState = {
  draggedTaskId: string | null;
  dragOverStatusId: string | null;
  dropTarget: { taskId: string; edge: "before" | "after" } | null;
};

export const emptyBoardDragState: BoardDragState = {
  draggedTaskId: null,
  dragOverStatusId: null,
  dropTarget: null,
};

export function leaveBoardColumn(state: BoardDragState, statusId: string) {
  return state.dragOverStatusId === statusId
    ? { ...state, dragOverStatusId: null }
    : state;
}
