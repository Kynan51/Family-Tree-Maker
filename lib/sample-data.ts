import type { FamilyMember, Relationship } from "./types";

// Example placeholder data for seeding
export const sampleFamilyMembers: (FamilyMember & { relationships?: Relationship[] })[] = [
  {
    id: "1",
    name: "John Doe",
    fullName: "John Doe",
    yearOfBirth: 1950,
    livingPlace: "Unknown",
    isDeceased: false,
    maritalStatus: "Single",
    gender: "male",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    familyId: "family-1",
    occupation: "Farmer",
    yearOfDeath: null,
    photoUrl: null,
    relationships: [
      { type: "spouse", relatedMemberId: "2" }
    ]
  },
  {
    id: "2",
    name: "Jane Doe",
    fullName: "Jane Doe",
    yearOfBirth: 1955,
    livingPlace: "Unknown",
    isDeceased: false,
    maritalStatus: "Married",
    gender: "female",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    familyId: "family-1",
    occupation: "Teacher",
    yearOfDeath: null,
    photoUrl: null,
    relationships: [
      { type: "spouse", relatedMemberId: "1" }
    ]
  }
];
