from dataclasses import dataclass
import networkx as nx
from collections import defaultdict


@dataclass
class Block:
    id: int
    profit_ore: float = 0.0
    profit_waste: float = 0.0
    mass_dest0: float = 0.0  
    mass_dest1: float = 0.0  

    @property
    def profit(self):
        return self.profit_ore + self.profit_waste


class SimpleMineScheduler:

    def __init__(self):
        self.graph = nx.DiGraph()
        self.blocks = {}
        self.name = ""
        self.T = 0
        self.D = 0
        self.discount = 0.1
        self.mined_time = {}
        self.schedule = defaultdict(list)
        self.resource_limits: dict[int, float] = {}  # Keyed by constraint_id/period

    def _load_prec_lines(self, lines):
        for line in lines:
            line = line.strip()
            if not line or line.startswith("%"):
                continue

            parts = list(map(int, line.split()))
            b_id, n_preds = parts[0], parts[1]
            preds = parts[2 : 2 + n_preds]

            self.graph.add_node(b_id)
            for p in preds:
                self.graph.add_edge(p, b_id)

    def load_prec(self, file):
        with open(file, encoding="utf-8") as f:
            self._load_prec_lines(f)
        print(
            f"Loaded graph | Nodes: {self.graph.number_of_nodes()} | "
            f"Edges: {self.graph.number_of_edges()}"
        )

    def load_prec_text(self, text: str):
        self._load_prec_lines(text.splitlines())

    def _load_pcpsp_lines(self, lines):
        reading_obj = False
        reading_coefficients = False
        reading_limits = False

        for raw_line in lines:
            line = raw_line.strip().replace(":", " ")
            parts = line.split()
            if not parts or line.startswith("%"):
                continue

            key = parts[0].upper()

            if key == "NAME":
                self.name = parts[1]
                continue
            elif key == "NPERIODS":
                self.T = int(parts[1])
                continue
            elif key == "NDESTINATIONS":
                self.D = int(parts[1])
                continue
            elif key == "DISCOUNT_RATE":
                self.discount = float(parts[1])
                continue
            elif "OBJECTIVE_FUNCTION" in key:
                reading_obj = True
                reading_coefficients = False
                reading_limits = False
                continue
            elif "RESOURCE_CONSTRAINT_COEFFICIENTS" in key:
                reading_obj = False
                reading_coefficients = True
                reading_limits = False
                continue
            elif "RESOURCE_CONSTRAINT_LIMITS" in key:
                reading_obj = False
                reading_coefficients = False
                reading_limits = True
                continue
            elif any(k in key for k in ["NAME", "TYPE"]):
                reading_obj = False
                reading_coefficients = False
                reading_limits = False
                continue

            if reading_obj and len(parts) >= 3:
                try:
                    b_id = int(parts[0])
                    self.blocks[b_id] = Block(
                        id=b_id,
                        profit_ore=float(parts[1]),
                        profit_waste=float(parts[2]),
                    )
                except ValueError:
                    continue

            elif reading_coefficients and len(parts) >= 4:
                try:
                    b_id = int(parts[0])
                    constraint_id = int(parts[1])
                    dest_id = int(parts[2])
                    coeff_val = float(parts[3])

                    if b_id in self.blocks:
                        if dest_id == 0:
                            self.blocks[b_id].mass_dest0 = max(self.blocks[b_id].mass_dest0, coeff_val)
                        elif dest_id == 1:
                            self.blocks[b_id].mass_dest1 = max(self.blocks[b_id].mass_dest1, coeff_val)
                except ValueError:
                    continue

            # 🟢 FIX: Handle both 2-column standard layout and multi-column limit rows safely
            elif reading_limits and len(parts) >= 2:
                try:
                    constraint_id = int(parts[0])
                    # If it's a simple layout, parts[1] is the limit value. If it's complex, look for type markers.
                    if len(parts) == 2:
                        self.resource_limits[constraint_id] = float(parts[1])
                    elif len(parts) >= 4:
                        period = int(parts[1])
                        constraint_type = parts[2].upper()
                        if constraint_type == "L":
                            self.resource_limits[period] = float(parts[3])
                        elif constraint_type == "I" and len(parts) >= 5:
                            self.resource_limits[period] = float(parts[4])
                except ValueError:
                    continue

    def _capacity_limit_for_period(self, period: int) -> float:
        # Match against constraint IDs directly or by matching period indices
        return self.resource_limits.get(period, 60000000.0)

    def load_pcpsp(self, file):
        with open(file, encoding="utf-8") as f:
            self._load_pcpsp_lines(f)
        print(f"Loaded PCPSP | Blocks: {len(self.blocks)} | Periods: {self.T}")

    def load_pcpsp_text(self, text: str):
        self._load_pcpsp_lines(text.splitlines())

    def solve(self):
        print("Running topological queue timeline distribution...")

        topo_order = list(nx.topological_sort(self.graph))
        blocks_per_period = max(50, len(self.blocks) // self.T + 1)

        for b in topo_order:
            if b not in self.blocks:
                continue

            t_min = 0
            for p in self.graph.predecessors(b):
                if p in self.mined_time:
                    t_min = max(t_min, self.mined_time[p])

            scheduled = False
            for t in range(t_min, self.T):
                if len(self.schedule[t]) < blocks_per_period:
                    self.mined_time[b] = t
                    self.schedule[t].append(b)
                    scheduled = True
                    break

            if not scheduled:
                final_period = self.T - 1
                self.mined_time[b] = final_period
                self.schedule[final_period].append(b)

    def build_result(self) -> dict:
        output = []
        ore_count = 0
        waste_count = 0

        for b, t in sorted(self.mined_time.items(), key=lambda x: (x[1], x[0])):
            block = self.blocks[b]
            dest = 0 if block.profit_ore >= block.profit_waste else 1
            if dest == 0:
                ore_count += 1
            else:
                waste_count += 1
            
            block_value = max(block.profit_ore, block.profit_waste)

            # 🟢 FIX: Send the exact raw unrounded weights directly without any hardcoded 71550 overrides
            output.append(
                {
                    "block_id": b, 
                    "destination": dest, 
                    "time_period": t,
                    "value": float(block_value),
                    "mass_dest0": float(block.mass_dest0),
                    "mass_dest1": float(block.mass_dest1)
                }
            )

        period_stats = []
        total_npv = 0.0
        period_tons = defaultdict(float)
        period_capacity = defaultdict(float)
        period_dest0_tons = defaultdict(float)
        period_dest1_tons = defaultdict(float)

        for row in output:
            t = row["time_period"]
            dest = row["destination"]
            m0 = row["mass_dest0"]
            m1 = row["mass_dest1"]
            
            # Pure mathematical accumulation based on real destination paths
            mass = m0 if dest == 0 else m1

            period_tons[t] += mass
            period_capacity[t] += mass
            if dest == 0:
                period_dest0_tons[t] += m0
            else:
                period_dest1_tons[t] += m1

        total_tons = sum(period_tons.values())
        total_capacity = sum(period_capacity.values())

        for t in sorted(self.schedule.keys()):
            period_blocks = self.schedule[t]
            period_npv = 0.0

            for b in period_blocks:
                profit = max(
                    self.blocks[b].profit_ore, self.blocks[b].profit_waste
                )
                period_npv += profit / ((1 + self.discount) ** (t + 1))

            total_npv += period_npv
            period_stats.append(
                {
                    "period": t,
                    "blockCount": len(period_blocks),
                    "npv": period_npv,
                    "tons": period_tons[t],
                    "capacity": period_capacity[t],
                    "oreTons": period_dest0_tons[t],
                    "wasteTons": period_dest1_tons[t],
                    "capacityLimit": self._capacity_limit_for_period(t),
                }
            )

        capacity_limits_by_period = [
            self._capacity_limit_for_period(t) for t in range(self.T)
        ]

        return {
            "name": self.name,
            "periods": self.T,
            "destinations": self.D,
            "discountRate": self.discount,
            "blockCount": len(self.blocks),
            "output": output,
            "totalNpv": total_npv,
            "totalTons": total_tons,
            "totalCapacity": total_capacity,
            "capacityLimitsByPeriod": capacity_limits_by_period,
            "periodStats": period_stats,
            "destinationSplit": {"ore": ore_count, "waste": waste_count},
        }

    def report(self):
        result = self.build_result()
        print("\n" + "=" * 55)
        print(f"   scheduled timeline report: {self.name.upper()}")
        print("=" * 55)

        for stat in result["periodStats"]:
            t = stat["period"]
            print(
                f"Period {t:2d} | Blocks processed: {stat['blockCount']:5d} | "
                f"NPV: ${stat['npv']:14.2f}"
            )

        print("-" * 55)
        print(f"Total combined NPV: ${result['totalNpv']:,.2f}")
        print("=" * 55 + "\n")


if __name__ == "__main__":
    datasets = ["zuck_small", "zuck_medium", "kd", "marvin"]

    for d in datasets:
        print("\n" + "#" * 50)
        print(f"Starting the process to run: {d}")
        print("#" * 50)

        scheduler = SimpleMineScheduler()
        try:
            scheduler.load_prec(f"dataset/{d}.prec")
            scheduler.load_pcpsp(f"dataset/{d}.pcpsp")
            scheduler.solve()
            scheduler.report()
        except FileNotFoundError:
            print("Skipping dataset: Component files missing inside dataset/ folder.")