
import { FieldValue, Timestamp } from 'firebase/firestore';

export type Alert = {
  id: string;
  driver_name: string;
  sender_vehicle: string;
  message: string;
  timestamp: number;
  userId?: string;
  latitude?: number;
  longitude?: number;
  impactForce?: number;
};

export type UserProfile = {
  id: string;
  driverName: string;
  vehicleNumber: string;
}

export type Note = {
    id: string;
    title: string;
    description?: string;
    createdAt: number | FieldValue | Timestamp;
    completed: boolean;
    userId: string;
};
