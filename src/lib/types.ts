import type { FieldValue } from 'firebase/firestore';

export type AlertType = 'Traffic' | 'Weather' | 'Accident' | 'Road Hazard' | 'Collision';

export type Alert = {
  id: string;
  message: string;
  type: AlertType;
  timestamp: number;
};

export type FirebaseAlert = {
    message: string;
    type: AlertType;
    timestamp: FieldValue;
}
