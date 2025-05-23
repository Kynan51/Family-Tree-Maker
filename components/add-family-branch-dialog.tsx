"use client"

import type React from "react"
import { useState } from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material"

interface AddFamilyBranchDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (name: string, location: string, head: string) => void
  familyHeads: string[]
}

const AddFamilyBranchDialog: React.FC<AddFamilyBranchDialogProps> = ({ open, onClose, onAdd, familyHeads }) => {
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [head, setHead] = useState("")

  const handleAdd = () => {
    if (name && location && head) {
      onAdd(name, location, head)
      setName("")
      setLocation("")
      setHead("")
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogTitle>Add New Family Branch</DialogTitle>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Branch Name"
          type="text"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          margin="dense"
          id="location"
          label="Location"
          type="text"
          fullWidth
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel id="head-select-label">Family Head</InputLabel>
          <Select
            labelId="head-select-label"
            id="head-select"
            value={head}
            onChange={(e) => setHead(e.target.value as string)}
            label="Family Head"
          >
            {familyHeads.map((headName) => (
              <MenuItem key={headName} value={headName}>
                {headName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name || !location || !head} variant="contained" color="primary">
            Add Branch
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  )
}

export default AddFamilyBranchDialog
