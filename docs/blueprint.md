# **App Name**: V2V AlertCast

## Core Features:

- Alert Submission: Users can submit vehicle alerts, including a message, which are stored in the Firebase Realtime Database under /alerts/.
- Real-time Alert Broadcasting: A Firebase Cloud Function triggers when a new alert is added to /alerts/ and sends an FCM notification to all users subscribed to the 'all_vehicles' topic.
- Topic Subscription: Client app subscribes to the 'all_vehicles' FCM topic to receive broadcast alerts.
- Alert Display: Client app listens for incoming FCM messages and displays the alert messages on-screen.
- Voice Alerts: Provides audible alerts to the user

## Style Guidelines:

- Primary color: Light pastel blue (#A0D2EB) to evoke calmness and reliability.
- Background color: Very light blue (#F0F8FF), almost white, for a clean interface.
- Accent color: Light pastel coral (#F08080) to signal alerts or important information.
- Body and headline font: 'PT Sans', a humanist sans-serif with a slightly warm and modern feel.
- Use simple, outlined icons in a light pastel color to represent different types of alerts (e.g., traffic, weather, accident).
- A clean, card-based layout to display alerts, with clear separation and easy readability.
- Subtle fade-in animations for new alerts to draw attention without being intrusive.