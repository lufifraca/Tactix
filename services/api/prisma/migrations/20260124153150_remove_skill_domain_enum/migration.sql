-- Convert SkillScore.domain from enum to text
ALTER TABLE "SkillScore" ALTER COLUMN "domain" TYPE TEXT;

-- Convert Quest.domain from enum to text
ALTER TABLE "Quest" ALTER COLUMN "domain" TYPE TEXT;

-- Drop the SkillDomain enum
DROP TYPE IF EXISTS "SkillDomain";
