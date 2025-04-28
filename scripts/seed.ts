import { config } from 'dotenv';
import { createAdminClient } from '../lib/supabase/admin';
import { sampleFamilyMembers } from '../lib/sample-data';

// Load environment variables
config();

async function seed() {
  const supabase = createAdminClient();
  console.log('Starting database seeding...');

  for (const member of sampleFamilyMembers) {
    try {
      // Extract relationships to insert separately
      const relationships = member.relationships || [];
      const memberWithoutRelationships = { ...member };
      delete memberWithoutRelationships.relationships;

      // Insert family member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert(memberWithoutRelationships)
        .select()
        .single();

      if (memberError) {
        console.error('Error creating family member:', memberError);
        continue;
      }

      // Insert relationships
      if (relationships.length > 0) {
        const relationshipsWithMemberId = relationships.map((rel) => ({
          ...rel,
          memberId: memberData.id,
        }));

        const { error: relError } = await supabase
          .from('relationships')
          .insert(relationshipsWithMemberId);

        if (relError) {
          console.error('Error creating relationships:', relError);
        }

        // Create reciprocal relationships
        const reciprocalRelationships = relationships.map((rel) => {
          let reciprocalType: 'parent' | 'child' | 'spouse' = 'spouse';
          if (rel.type === 'parent') {
            reciprocalType = 'child';
          } else if (rel.type === 'child') {
            reciprocalType = 'parent';
          }
          return {
            memberId: rel.relatedMemberId,
            relatedMemberId: memberData.id,
            type: reciprocalType,
          };
        });

        if (reciprocalRelationships.length > 0) {
          const { error: recipError } = await supabase
            .from('relationships')
            .insert(reciprocalRelationships);
          if (recipError) {
            console.error('Error creating reciprocal relationships:', recipError);
          }
        }
      }
      console.log(`Successfully inserted family member: ${member.fullName}`);
    } catch (error) {
      console.error(`Error processing member ${member.fullName}:`, error);
    }
  }
  console.log('Database seeding completed.');
}

// Execute the seed function
seed().catch((error) => {
  console.error('Error during seeding:', error);
  process.exit(1);
}); 