import { Sun, Cloud, CloudRain, CloudFog, Zap, type LucideProps } from "lucide-react";

const iconMap: { [key: string]: React.ElementType } = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  drizzle: CloudRain,
  fog: CloudFog,
  mist: CloudFog,
  storm: Zap,
  thunderstorm: Zap,
  default: Sun,
};

export function WeatherIcon({
  condition,
  ...props
}: { condition: string } & LucideProps) {
  const lowerCaseCondition = condition.toLowerCase();
  let Icon = iconMap.default;

  for (const keyword in iconMap) {
    if (lowerCaseCondition.includes(keyword)) {
      Icon = iconMap[keyword];
      break;
    }
  }

  return <Icon {...props} />;
}
