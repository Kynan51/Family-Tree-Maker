"use client"
import { useState, useTransition, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function FamilyTreeRootMemberForm({ familyId, userId, existingMember }: { familyId: string, userId: string, existingMember?: any }) {
  const [form, setForm] = useState({
    fullName: '',
    yearOfBirth: '',
    yearOfDeath: '', // Added yearOfDeath field
    livingPlace: '',
    maritalStatus: 'Single',
    occupation: '',
    isDeceased: 'false',
    gender: 'unknown',
  });

  useEffect(() => {
    if (existingMember) {
      setForm({
        fullName: existingMember.fullName || '',
        yearOfBirth: existingMember.yearOfBirth || '',
        yearOfDeath: existingMember.yearOfDeath || '', // Added yearOfDeath field
        livingPlace: existingMember.livingPlace || '',
        maritalStatus: existingMember.maritalStatus || 'Single',
        occupation: existingMember.occupation || '',
        isDeceased: existingMember.isDeceased ? 'true' : 'false',
        gender: existingMember.gender || 'unknown',
      });
    }
  }, [existingMember]);

  const [loading, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.isDeceased === 'true' && !form.yearOfDeath) {
      setError('Year of Death is required for deceased members.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: member, error: memberError } = await supabase.from("family_members").insert({
        full_name: form.fullName,
        year_of_birth: parseInt(form.yearOfBirth),
        year_of_death: form.isDeceased === 'true' ? parseInt(form.yearOfDeath) : null, // Handle yearOfDeath
        living_place: form.livingPlace.trim() ? form.livingPlace : "N/A",
        is_deceased: form.isDeceased === 'true',
        marital_status: form.maritalStatus,
        occupation: form.occupation.trim() ? form.occupation : "N/A",
        family_id: familyId,
        gender: form.gender,
      }).select().single();

      if (memberError) {
        setError(memberError.message);
        return;
      }

      if (form.isDeceased === 'false') {
        await supabase.from("user_family_access").insert({
          user_id: userId,
          family_id: familyId,
          access_level: "admin",
          status: "approved",
        });
      }

      setSuccess(true);
      window.location.reload();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Full Name</label>
        <input name="fullName" required className="w-full border rounded px-3 py-2" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Year of Birth</label>
        <input name="yearOfBirth" type="number" required className="w-full border rounded px-3 py-2" value={form.yearOfBirth} onChange={e => setForm(f => ({ ...f, yearOfBirth: e.target.value }))} />
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Year of Death</label>
        <input
          name="yearOfDeath"
          type="number"
          className="w-full border rounded px-3 py-2"
          value={form.yearOfDeath}
          onChange={e => setForm(f => ({ ...f, yearOfDeath: e.target.value }))}
          disabled={form.isDeceased === 'false'} // Disable if not deceased
          required={form.isDeceased === 'true'} // Required if deceased
        />
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Living Place</label>
        <input name="livingPlace" required className="w-full border rounded px-3 py-2" value={form.livingPlace} onChange={e => setForm(f => ({ ...f, livingPlace: e.target.value }))} />
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Marital Status</label>
        <select name="maritalStatus" required className="w-full border rounded px-3 py-2" value={form.maritalStatus} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Occupation</label>
        <input name="occupation" className="w-full border rounded px-3 py-2" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} />
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Deceased?</label>
        <select name="isDeceased" required className="w-full border rounded px-3 py-2" value={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.value }))}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block mb-1 font-medium">Gender</label>
        <select
          name="gender"
          required
          className="w-full border rounded px-3 py-2"
          value={form.gender}
          onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">Member added!</div>}
      <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition-colors" disabled={loading}>
        {loading ? "Adding..." : "Add First Member"}
      </button>
    </form>
  )
}