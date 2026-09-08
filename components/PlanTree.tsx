type PlanNode = {
  "Node Type": string;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Relation Name"?: string;
  "Index Name"?: string;
  "Plans"?: PlanNode[];
};

function Row({ node, depth }: { node: PlanNode; depth: number }) {
  const isSeqScan = node["Node Type"] === "Seq Scan";
  return (
    <>
      <div
        className="flex items-center gap-2 py-1.5 text-xs border-b border-border/50"
        style={{ paddingLeft: depth * 18 }}
      >
        <span
          className={`px-1.5 py-0.5 rounded font-medium ${
            isSeqScan ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
          }`}
        >
          {node["Node Type"]}
        </span>
        {node["Relation Name"] && <span className="text-muted">on {node["Relation Name"]}</span>}
        {node["Index Name"] && <span className="text-muted">via {node["Index Name"]}</span>}
        <span className="ml-auto mono text-muted">
          {node["Actual Total Time"]?.toFixed(2)} ms · {node["Actual Rows"]?.toLocaleString()} rows
        </span>
      </div>
      {node["Plans"]?.map((child, i) => <Row key={i} node={child} depth={depth + 1} />)}
    </>
  );
}

export default function PlanTree({ plan }: { plan: PlanNode }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Row node={plan} depth={0} />
    </div>
  );
}
