import type { database } from 'firebase/app';

export type AlertType = 'Traffic' | 'Weather' | 'Accident' | 'Road Hazard';

export type Alert = {
  id: string;
  message: string;
  type: AlertType;
  timestamp: number;
};

export type FirebaseAlert = {
    message: string;
    type: AlertType;
    timestamp: database.ServerValue | number;
}
