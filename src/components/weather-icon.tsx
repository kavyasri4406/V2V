'use client';

import {
  Sun,
  CloudSun,
  Cloud,
  Cloudy,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
  Zap,
  Thermometer,
  type LucideProps,
} from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  sunny: Sun,
  'clear': Sun,
  'partly cloudy': CloudSun,
  cloudy: Cloud,
  overcast: Cloudy,
  rain: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  mist: CloudFog,
  windy: Wind,
  thunderstorm: Zap,
  default: Thermometer,
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
