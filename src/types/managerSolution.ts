/** Manager backend output — schedule only, no pre-computed analytics. */
export interface ManagerMinePlanRow {
  block: number;
  'time period': number;
  destination: number;
}

export interface ManagerSolutionFile {
  mine_plan: ManagerMinePlanRow[];
}
