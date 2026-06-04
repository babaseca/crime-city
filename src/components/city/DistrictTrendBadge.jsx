import { districtTrend } from "../../engine/districtSystem";
import TrendBadge from "../common/TrendBadge";

export default function DistrictTrendBadge({ district }) {
  return <TrendBadge trend={districtTrend(district)} />;
}
