import { FieldValue, Timestamp } from 'firebase/firestore';

export type Alert = {
  id: string;
  driver_name: string;
  sender_vehicle: string;
  message: string;
  timestamp: number | FieldValue | Timestamp;
  userId?: string;
};

export type UserProfile = {
  id: string;
  driverName: string;
  vehicleNumber: string;
}
