import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function FamilySelectDialog({ open, families, onSelect, onOpenChange }) {
  const [selected, setSelected] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Family</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a family..." />
            </SelectTrigger>
            <SelectContent>
              {families.map(fam => (
                <SelectItem key={fam.id} value={fam.id}>
                  {fam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="w-full"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 