import { FieldValue } from 'firebase/firestore';

export type Alert = {
  id: string;
  driver_name: string;
  sender_vehicle: string;
  message: string;
  timestamp: number | FieldValue;
};
