import * as admin from 'firebase-functions/v2/firestore';
import * as https from 'firebase-functions/v2/https';
import * as scheduler from 'firebase-functions/v2/scheduler';
import * as storage from 'firebase-functions/v2/storage';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onRequest} from 'firebase-functions/v2/https';

import {sendPushNotification} from './notifications';
import {triggerSpondSync} from './spondSync';
import {generateInviteCode, createFamily, joinFamilyByInviteCode, leaveFamily, removeFamilyMember} from './family';
import {syncProfileFromAuth} from './userProfile';
import {processImportData, processExportData} from './importExport';
import {processImageOnUpload} from './imageProcessor';
import {onCalendarEventCreated, onCalendarEventUpdated, onCalendarEventDeleted} from './googleCalendar';
import {onTripTransportCreatedForCalendar, onTripTransportUpdatedForCalendar, onTripTransportDeletedForCalendar} from './googleCalendarTripTransport';
import {onTripCreatedForCalendar, onTripUpdatedForCalendar, onTripDeletedForCalendar} from './googleCalendarTrips';
import {onHealthMedicineCreatedForCalendar, onHealthMedicineUpdatedForCalendar, onHealthMedicineDeletedForCalendar} from './googleCalendarHealthMedicine';
import {onHealthVetVisitCreatedForCalendar, onHealthVetVisitUpdatedForCalendar, onHealthVetVisitDeletedForCalendar} from './googleCalendarHealthVetVisit';
import {onPetVetVisitCreatedForCalendar, onPetVetVisitUpdatedForCalendar, onPetVetVisitDeletedForCalendar} from './googleCalendarPetVetVisit';
import {voiceToEvent} from './voiceToEvent';
import {destinationTips} from './destinationTips';
import {photoToData} from './photoToData';
import {analyzeHomeProject} from './analyzeHomeProject';
import {importHolidaysFromUrl} from './importHolidaysFromUrl';
import {transcribeAudio} from './transcribeAudio';
import {analyzeMeetingNotes} from './analyzeMeetingNotes';

initializeApp();

export const scheduledSpondSync = onSchedule('*/30 * * * *', async () => {
  await triggerSpondSync();
});

export const onEventCreated = onDocumentCreated(
  'events/{eventId}',
  async (event) => {
    const data = event.data?.data();
    if (data && data.notificationId) {
      await sendPushNotification(data.notificationId, 'Påminnelse', data.title);
    }
    if (data && data.googleCalendarEventId) {
      // Already synced
    } else if (data) {
      await onCalendarEventCreated(event);
    }
  },
);

export const onEventUpdated = onDocumentCreated(
  'events/{eventId}',
  async (event) => {
    await onCalendarEventUpdated(event);
  },
);

export const onEventDeleted = onDocumentCreated(
  'events/{eventId}',
  async (event) => {
    await onCalendarEventDeleted(event);
  },
);

export const onTripTransportCreated = onDocumentCreated(
  'trips/{tripId}/transport/{transportId}',
  async (event) => {
    await onTripTransportCreatedForCalendar(event);
  },
);

export const onTripTransportUpdated = onDocumentCreated(
  'trips/{tripId}/transport/{transportId}',
  async (event) => {
    await onTripTransportUpdatedForCalendar(event);
  },
);

export const onTripTransportDeleted = onDocumentCreated(
  'trips/{tripId}/transport/{transportId}',
  async (event) => {
    await onTripTransportDeletedForCalendar(event);
  },
);

export const onTripCreated = onDocumentCreated(
  'trips/{tripId}',
  async (event) => {
    await onTripCreatedForCalendar(event);
  },
);

export const onTripUpdated = onDocumentCreated(
  'trips/{tripId}',
  async (event) => {
    await onTripUpdatedForCalendar(event);
  },
);

export const onTripDeleted = onDocumentCreated(
  'trips/{tripId}',
  async (event) => {
    await onTripDeletedForCalendar(event);
  },
);

export const onHealthMedicineCreated = onDocumentCreated(
  'health/{healthId}',
  async (event) => {
    const data = event.data?.data();
    if (data && data.type === 'medicine') {
      await onHealthMedicineCreatedForCalendar(event);
    }
  },
);

export const onHealthMedicineUpdated = onDocumentCreated(
  'health/{healthId}',
  async (event) => {
    const data = event.data?.data();
    if (data && data.type === 'medicine') {
      await onHealthMedicineUpdatedForCalendar(event);
    }
  },
);

export const onHealthMedicineDeleted = onDocumentCreated(
  'health/{healthId}',
  async (event) => {
    await onHealthMedicineDeletedForCalendar(event);
  },
);

export const onHealthVetVisitCreated = onDocumentCreated(
  'health/{healthId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onHealthVetVisitCreatedForCalendar(event);
  },
);

export const onHealthVetVisitUpdated = onDocumentCreated(
  'health/{healthId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onHealthVetVisitUpdatedForCalendar(event);
  },
);

export const onHealthVetVisitDeleted = onDocumentCreated(
  'health/{healthId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onHealthVetVisitDeletedForCalendar(event);
  },
);

export const onPetVetVisitCreated = onDocumentCreated(
  'pets/{petId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onPetVetVisitCreatedForCalendar(event);
  },
);

export const onPetVetVisitUpdated = onDocumentCreated(
  'pets/{petId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onPetVetVisitUpdatedForCalendar(event);
  },
);

export const onPetVetVisitDeleted = onDocumentCreated(
  'pets/{petId}/vetVisits/{vetVisitId}',
  async (event) => {
    await onPetVetVisitDeletedForCalendar(event);
  },
);

export const onProfileCreated = onDocumentCreated(
  'userProfiles/{userId}',
  async (event) => {
    await syncProfileFromAuth(event);
  },
);

export const generateInviteCodeFunction = https.onCall(
  generateInviteCode,
);

export const createFamilyFunction = https.onCall(createFamily);

export const joinFamilyByInviteCodeFunction = https.onCall(
  joinFamilyByInviteCode,
);

export const leaveFamilyFunction = https.onCall(leaveFamily);

export const removeFamilyMemberFunction = https.onCall(
  removeFamilyMember,
);

export const processImportDataFunction = https.onCall(
  processImportData,
);

export const processExportDataFunction = https.onCall(
  processExportData,
);

export {processImageOnUpload};

export const spondProxy = onRequest(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({error: 'Unauthorized'});
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    await getAuth().verifyIdToken(idToken);
  } catch (error) {
    res.status(403).json({error: 'Invalid token'});
    return;
  }

  const {SpondGroupFetcher} = require('./spondGroupFetcher');
  const spondConfig = {
    username: process.env.SPOND_USERNAME,
    password: process.env.SPOND_PASSWORD,
  };

  if (!spondConfig.username || !spondConfig.password) {
    res.status(500).json({error: 'Spond credentials not configured'});
    return;
  }

  try {
    const fetcher = new SpondGroupFetcher(spondConfig);
    const data = await fetcher.fetchGroupData();
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Spond fetch error:', error);
    res.status(500).json({error: error.message || 'Failed to fetch Spond data'});
  }
});

// --- Admin: generate all years for a child ---
export const generateSchoolYears = https.onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const {childId, startYear, endYear, schoolName} = request.data;
  const uid = request.auth.uid;
  const db = getFirestore();
  const profileSnap = await db.collection('userProfiles').doc(uid).get();
  const familyId = profileSnap.data()?.familyId;
  if (!familyId) throw new Error('No familyId');

  for (let year = startYear; year <= endYear; year++) {
    await db.collection('schoolYears').add({
      childId,
      year: String(year),
      group: '',
      school: schoolName || '',
      familyId,
      createdAt: Date.now(),
    });
  }
  return {success: true};
});

export const generateKindergartenYears = https.onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const {childId, startAge, endAge, kindergartenName} = request.data;
  const uid = request.auth.uid;
  const db = getFirestore();
  const profileSnap = await db.collection('userProfiles').doc(uid).get();
  const familyId = profileSnap.data()?.familyId;
  if (!familyId) throw new Error('No familyId');

  for (let age = startAge; age <= endAge; age++) {
    await db.collection('kindergartenYears').add({
      childId,
      year: String(age),
      group: '',
      kindergarten: kindergartenName || '',
      familyId,
      createdAt: Date.now(),
    });
  }
  return {success: true};
});

export const voiceToEventFunction = https.onCall(voiceToEvent);
export const destinationTipsFunction = https.onCall(destinationTips);
export const photoToDataFunction = https.onCall(photoToData);
export const analyzeHomeProjectFunction = https.onCall(analyzeHomeProject);
export const importHolidaysFromUrlFunction = https.onCall(importHolidaysFromUrl);
export const transcribeAudioFunction = https.onCall(transcribeAudio);
export const analyzeMeetingNotesFunction = https.onCall(analyzeMeetingNotes);
