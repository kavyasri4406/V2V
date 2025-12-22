'use client';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
  Tornado,
  Cloudy,
  type LucideProps
} from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
    Clear: Sun,
    Clouds: Cloud,
    Rain: CloudRain,
    Drizzle: CloudDrizzle,
    Thunderstorm: CloudLightning,
    Snow: Snowflake,
    Mist: CloudFog,
    Smoke: CloudFog,
    Haze: CloudFog,
    Dust: Wind,
    Fog: CloudFog,
    Sand: Wind,
    Ash: CloudFog,
    Squall: Wind,
    Tornado: Tornado,
    default: Cloudy,
};

export function WeatherIcon({
  condition,
  ...props
}: { condition: string } & LucideProps) {
  const Icon = iconMap[condition] || iconMap.default;
  return <Icon {...props} />;
}
