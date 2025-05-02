import React, { useState, useEffect } from "react";
import { EditFamilyMemberDialog } from "./edit-family-member-dialog";
import { FamilySelectDialog } from "./family-select-dialog";

// TODO: Replace this with your actual families data source or prop
const families = [
  { id: "1aa8a534-b8d1-4e82-8a41-2b23268c2dc6", name: "family3" },
  { id: "4c7ae124-500c-4bc1-b018-c2b88b8bb47f", name: "family4" },
  // ...other families
];

export function AddOrEditFamilyMemberWrapper(props) {
  // Only show families where user is admin
  const adminFamilies = props.accessibleFamilies?.filter(
    fam =>
      fam.created_by === props.userId ||
      fam.admins?.some(admin => admin.user_id === props.userId)
  ) || [];

  // Accept an optional initialFamilyId prop for pre-selection
  const initialFamilyId = props.initialFamilyId || "";
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId);

  // If initialFamilyId changes (e.g., user filters in dashboard), update selection
  useEffect(() => {
    setSelectedFamilyId(initialFamilyId);
  }, [initialFamilyId]);

  // Filter members for the selected family
  const familyMembers = props.allMembers?.filter(
    m => m.familyId === selectedFamilyId || m.family_id === selectedFamilyId
  ) || [];

  // Handler to close the modal and reset selection
  const handleFamilyDialogClose = (open) => {
    if (!open) {
      setSelectedFamilyId("");
      props.onOpenChange(false);
    }
  };

  return (
    <>
      <FamilySelectDialog
        open={!selectedFamilyId && props.open}
        families={adminFamilies}
        onSelect={setSelectedFamilyId}
        onOpenChange={handleFamilyDialogClose}
      />
      {selectedFamilyId && (
        <EditFamilyMemberDialog
          open={props.open}
          onOpenChange={val => {
            if (!val) setSelectedFamilyId(""); // Reset on close
            props.onOpenChange(val);
          }}
          member={props.member}
          existingMembers={familyMembers}
          onUpdate={props.onUpdate}
          familyId={selectedFamilyId}
        />
      )}
    </>
  );
} 