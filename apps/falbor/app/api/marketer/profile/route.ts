import { db } from '~/lib/db';
import { marketerProfiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      userId: string;
      fullName: string;
      photoUrl?: string;
      bio: string;
      yearsOfExperience: string;
      age?: string;
      phone?: string;
      showEmail: boolean;
      location?: string;
      specialties: string[];
      linkedinUrl?: string;
      twitterUrl?: string;
      instagramUrl?: string;
    };

    if (!body.userId || !body.fullName || !body.bio || !body.yearsOfExperience) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await db
      .select({ id: marketerProfiles.id })
      .from(marketerProfiles)
      .where(eq(marketerProfiles.userId, body.userId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(marketerProfiles)
        .set({
          fullName: body.fullName,
          photoUrl: body.photoUrl || null,
          bio: body.bio,
          yearsOfExperience: parseInt(body.yearsOfExperience, 10),
          age: body.age ? parseInt(body.age, 10) : null,
          phone: body.phone || null,
          showEmail: body.showEmail,
          location: body.location || null,
          specialties: body.specialties,
          linkedinUrl: body.linkedinUrl || null,
          twitterUrl: body.twitterUrl || null,
          instagramUrl: body.instagramUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(marketerProfiles.userId, body.userId))
        .returning({ id: marketerProfiles.id });
      return Response.json({ profileId: updated.id });
    }

    const id = v4();
    const [profile] = await db
      .insert(marketerProfiles)
      .values({
        id,
        userId: body.userId,
        fullName: body.fullName,
        photoUrl: body.photoUrl || null,
        bio: body.bio,
        yearsOfExperience: parseInt(body.yearsOfExperience, 10),
        age: body.age ? parseInt(body.age, 10) : null,
        phone: body.phone || null,
        showEmail: body.showEmail,
        location: body.location || null,
        specialties: body.specialties,
        linkedinUrl: body.linkedinUrl || null,
        twitterUrl: body.twitterUrl || null,
        instagramUrl: body.instagramUrl || null,
      })
      .returning({ id: marketerProfiles.id });

    return Response.json({ profileId: profile.id });
  } catch (error) {
    console.error('[marketer/profile] POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
