import {
  TrafficCone,
  Car,
  TriangleAlert,
  ShieldAlert,
  Siren,
  Info,
  type LucideProps,
  MessageSquareWarning,
} from "lucide-react";

const iconMap: { [key: string]: React.ElementType } = {
  collision: ShieldAlert,
  accident: Car,
  "road block": TrafficCone,
  "traffic jam": TrafficCone,
  hazard: TriangleAlert,
  emergency: Siren,
  default: MessageSquareWarning,
};

export function AlertIcon({
  message,
  ...props
}: { message: string } & LucideProps) {
  const lowerCaseMessage = message.toLowerCase();
  let Icon = iconMap.default;

  for (const keyword in iconMap) {
    if (lowerCaseMessage.includes(keyword)) {
      Icon = iconMap[keyword];
      break;
    }
  }

  return <Icon {...props} />;
}
