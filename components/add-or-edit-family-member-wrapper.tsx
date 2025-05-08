import React, { useState, useEffect } from "react";
import { EditFamilyMemberDialog } from "./edit-family-member-dialog";
import { FamilySelectDialog } from "./family-select-dialog";
import { LoadingSpinner } from "./ui/loading-spinner";

// TODO: Replace this with your actual families data source or prop
const families = [
  { id: "1aa8a534-b8d1-4e82-8a41-2b23268c2dc6", name: "family3" },
  { id: "4c7ae124-500c-4bc1-b018-c2b88b8bb47f", name: "family4" },
  // ...other families
];

export function AddOrEditFamilyMemberWrapper(props) {
  const [isLoading, setIsLoading] = useState(true);
  const initialFamilyId = props.initialFamilyId || "";
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId);

  useEffect(() => {
    // Simulate data loading or replace with actual data fetching logic
    const fetchData = async () => {
      setIsLoading(true);
      // Example: await fetchFamilies();
      setTimeout(() => setIsLoading(false), 1000); // Replace with real data loading
    };
    fetchData();
  }, [props.accessibleFamilies, props.allMembers]);

  useEffect(() => {
    setSelectedFamilyId(initialFamilyId);
  }, [initialFamilyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only show families where user is admin
  const adminFamilies = props.accessibleFamilies?.filter(
    fam =>
      fam.created_by === props.userId ||
      fam.admins?.some(admin => admin.user_id === props.userId)
  ) || [];

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
        <>
          {console.log("DEBUG: Member passed to EditFamilyMemberDialog:", props.member)} {/* Debug log */}
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
        </>
      )}
    </>
  );
}