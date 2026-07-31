# Privacy Policy

**Last updated: 2025-01-01**

## 1. Overview

This Privacy Policy describes how **ProjectInkedAbyss** ("the App," "we," "us") collects, uses, and protects information when you use our X (Twitter) application. The App is a self-hosted instance of the open-source [Postiz](https://github.com/gitroomhq/postiz-app) platform.

## 2. Information We Collect

### 2.1 X (Twitter) Account Data

When you authenticate with X, the App receives access to:
- Your X account profile information (handle, display name, avatar)
- Posts and media you create or schedule through the App
- Engagement metrics for posts published through the App

### 2.2 Technical Data

As a self-hosted application running locally, the App may store:
- OAuth access tokens (encrypted) required to interact with X's API on your behalf
- Scheduled post content and metadata
- Post history and publishing status

### 2.3 Data We Do NOT Collect

- We do not request or store your email address from X
- We do not collect analytics or tracking data about your usage
- We do not share your data with third parties
- We do not use cookies or browser tracking

## 3. How We Use Your Information

Your data is used solely to:
- Authenticate with the X API
- Create, schedule, and publish posts to your X account(s)
- Display post history and engagement data within the App dashboard

## 4. Data Storage and Security

- All data is stored locally within the self-hosted Docker containers running on your machine
- OAuth tokens are encrypted at rest
- The App runs entirely on your infrastructure — no data is transmitted to external servers beyond X's own API endpoints
- You control all data through the Docker volumes on your host machine

## 5. Data Retention

Your data is retained in the App's local database for as long as you use the App. You can delete your data at any time by:
- Disconnecting your X account from within the App
- Removing the App's Docker volumes

## 6. Third-Party Services

The App communicates exclusively with:
- **X (Twitter) API** — to perform the social media management functions you authorize
- No other third-party services receive your data

## 7. Your Rights

You have the right to:
- Revoke the App's access to your X account at any time via X's connected apps settings
- Delete all locally stored data by removing the App's containers and volumes
- Request information about what data is stored (it is all in your local database)

## 8. Children's Privacy

The App is not intended for use by individuals under the age of 13.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected in this document, hosted in the same repository.

## 10. Contact

This is an independently operated, self-hosted application. For privacy-related questions, open an issue at the repository hosting this document.
