/**
 * SQL de inicialização do schema para novos tenants Ovile Eleitoral.
 * Gerado via: npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
 * Atualizar sempre que o schema mudar.
 */
export function getTenantInitSql(campaignId: string, campaignName: string): string {
  return INIT_SQL
    .replace(/DEFAULT 'andre-santos-2026'/g, `DEFAULT '${campaignId}'`)
    .replace(/DEFAULT 'Base Andre Santos'/g, `DEFAULT '${campaignName}'`);
}

const INIT_SQL = `
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEADER', 'MEMBER');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED');
CREATE TYPE "CollaboratorRole" AS ENUM ('COORD_GERAL', 'COORD_REGIONAL', 'LIDER_MUNICIPAL', 'LIDER_BAIRRO', 'VOLUNTARIO');
CREATE TYPE "CollaboratorStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
CREATE TYPE "ZoneType" AS ENUM ('REGIONAL', 'MUNICIPAL', 'BAIRRO');
CREATE TYPE "CampaignEventType" AS ENUM ('REUNIAO', 'CULTO', 'PANFLETAGEM', 'TREINAMENTO', 'VISITA', 'PODCAST', 'GRAVACAO', 'OUTRO');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED');
CREATE TYPE "CollaboratorProfile" AS ENUM ('PASTOR', 'PRESIDENTE_ASSOCIACAO', 'LIDER_POLITICO', 'VEREADOR', 'EMPRESARIO', 'LIDERANCA_COMUNITARIA', 'LIDER_RELIGIOSO', 'EDUCADOR', 'FAMILIA', 'JOVEM', 'APOIADOR');
CREATE TYPE "CollaboratorChannel" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'EVENTO', 'LINK', 'OUTRO');
CREATE TYPE "SupportStatus" AS ENUM ('CONFIRMADO', 'NEGOCIANDO', 'NEUTRO', 'ADVERSARIO');
CREATE TYPE "CollaboratorTier" AS ENUM ('APOIADOR', 'ATIVISTA', 'LIDER_CELULA', 'COORDENADOR');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE "ChurchAssignmentStatus" AS ENUM ('PENDENTE', 'ENTREGUE', 'NAO_FOI_POSSIVEL');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "logoBase64" TEXT, "joinCode" TEXT,
    "slug" TEXT, "dbUrl" TEXT, "plan" TEXT NOT NULL DEFAULT 'free', "active" BOOLEAN NOT NULL DEFAULT true,
    "candidateName" TEXT, "candidatePhoto" TEXT, "party" TEXT, "district" TEXT,
    "electionYear" INTEGER, "primaryColor" TEXT, "secondaryColor" TEXT, "adminEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT,
    "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3), "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER', "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "UserCampaign" (
    "id" TEXT NOT NULL, "userId" TEXT, "pendingEmail" TEXT, "campaignId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER', "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "tier" "CollaboratorTier" NOT NULL DEFAULT 'APOIADOR', "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acceptedAt" TIMESTAMP(3), "collaboratorId" TEXT,
    CONSTRAINT "UserCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT,
    "type" TEXT NOT NULL, "read" BOOLEAN NOT NULL DEFAULT false, "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT,
    "phone" TEXT, "city" TEXT, "neighborhood" TEXT,
    "campaignRole" "CollaboratorRole" NOT NULL DEFAULT 'VOLUNTARIO',
    "status" "CollaboratorStatus" NOT NULL DEFAULT 'ACTIVE', "notes" TEXT, "photoUrl" TEXT, "birthday" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT, "channel" "CollaboratorChannel", "profile" "CollaboratorProfile" NOT NULL DEFAULT 'APOIADOR',
    "supportStatus" "SupportStatus" NOT NULL DEFAULT 'NEUTRO', "mobilizationScore" DOUBLE PRECISION,
    "contributionTypes" TEXT[], "registeredById" TEXT,
    "lgpdConsent" BOOLEAN NOT NULL DEFAULT false, "lgpdConsentAt" TIMESTAMP(3), "lastContactedAt" TIMESTAMP(3), "userId" TEXT,
    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Zone" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL DEFAULT 'MUNICIPAL', "parentId" TEXT, "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZoneCollaborator" (
    "id" TEXT NOT NULL, "zoneId" TEXT NOT NULL, "collaboratorId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZoneCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppGroup" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "zoneId" TEXT, "name" TEXT NOT NULL,
    "inviteLink" TEXT, "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppGroupMember" (
    "id" TEXT NOT NULL, "groupId" TEXT NOT NULL, "collaboratorId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026', "zoneId" TEXT,
    "title" TEXT NOT NULL, "type" "CampaignEventType" NOT NULL DEFAULT 'REUNIAO',
    "date" TIMESTAMP(3) NOT NULL, "location" TEXT, "notes" TEXT, "googleCalendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "collaboratorId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT', "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "title" TEXT NOT NULL, "message" TEXT NOT NULL, "audience" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0, "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL, "token" TEXT NOT NULL, "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "role" "Role" NOT NULL DEFAULT 'MEMBER', "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3), "useCount" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3), "usedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton', "campaignName" TEXT NOT NULL DEFAULT 'Base Andre Santos',
    "logoBase64" TEXT, "googleRefreshToken" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MunicipalityGoal" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "city" TEXT NOT NULL, "targetVotes" INTEGER NOT NULL DEFAULT 0, "targetLeaders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MunicipalityGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "collaboratorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL, "channel" TEXT, "actorId" TEXT, "source" TEXT, "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT NOT NULL,
    "targetId" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "title" TEXT NOT NULL, "description" TEXT, "assignedToId" TEXT NOT NULL, "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3), "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Church" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "name" TEXT NOT NULL,
    "regional" TEXT,
    "denominacao" TEXT,
    "pastorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ChurchAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "churchId" TEXT NOT NULL,
    "status" "ChurchAssignmentStatus" NOT NULL DEFAULT 'PENDENTE',
    "photoUrl" TEXT,
    "notes" TEXT,
    "assignedById" TEXT NOT NULL,
    "member1Id" TEXT NOT NULL,
    "member2Id" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX "Campaign_joinCode_key" ON "Campaign"("joinCode");
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_campaignId_idx" ON "User"("campaignId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "UserCampaign_collaboratorId_key" ON "UserCampaign"("collaboratorId");
CREATE INDEX "UserCampaign_pendingEmail_idx" ON "UserCampaign"("pendingEmail");
CREATE UNIQUE INDEX "UserCampaign_userId_campaignId_key" ON "UserCampaign"("userId", "campaignId");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE UNIQUE INDEX "Collaborator_userId_key" ON "Collaborator"("userId");
CREATE INDEX "Collaborator_campaignId_idx" ON "Collaborator"("campaignId");
CREATE INDEX "Collaborator_email_idx" ON "Collaborator"("email");
CREATE INDEX "Collaborator_city_idx" ON "Collaborator"("city");
CREATE INDEX "Collaborator_registeredById_idx" ON "Collaborator"("registeredById");
CREATE INDEX "Collaborator_status_idx" ON "Collaborator"("status");
CREATE INDEX "Collaborator_supportStatus_idx" ON "Collaborator"("supportStatus");
CREATE INDEX "Collaborator_campaignId_status_idx" ON "Collaborator"("campaignId", "status");
CREATE INDEX "Collaborator_campaignId_createdAt_idx" ON "Collaborator"("campaignId", "createdAt");
CREATE INDEX "Zone_campaignId_idx" ON "Zone"("campaignId");
CREATE INDEX "Zone_parentId_idx" ON "Zone"("parentId");
CREATE INDEX "ZoneCollaborator_collaboratorId_idx" ON "ZoneCollaborator"("collaboratorId");
CREATE UNIQUE INDEX "ZoneCollaborator_zoneId_collaboratorId_key" ON "ZoneCollaborator"("zoneId", "collaboratorId");
CREATE INDEX "WhatsAppGroup_campaignId_idx" ON "WhatsAppGroup"("campaignId");
CREATE INDEX "WhatsAppGroup_zoneId_idx" ON "WhatsAppGroup"("zoneId");
CREATE INDEX "WhatsAppGroupMember_collaboratorId_idx" ON "WhatsAppGroupMember"("collaboratorId");
CREATE UNIQUE INDEX "WhatsAppGroupMember_groupId_collaboratorId_key" ON "WhatsAppGroupMember"("groupId", "collaboratorId");
CREATE INDEX "Event_campaignId_idx" ON "Event"("campaignId");
CREATE INDEX "Event_zoneId_idx" ON "Event"("zoneId");
CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE INDEX "Attendance_eventId_idx" ON "Attendance"("eventId");
CREATE INDEX "Attendance_collaboratorId_idx" ON "Attendance"("collaboratorId");
CREATE UNIQUE INDEX "EventRsvp_eventId_collaboratorId_key" ON "EventRsvp"("eventId", "collaboratorId");
CREATE INDEX "Broadcast_campaignId_idx" ON "Broadcast"("campaignId");
CREATE UNIQUE INDEX "InviteLink_token_key" ON "InviteLink"("token");
CREATE INDEX "InviteLink_campaignId_idx" ON "InviteLink"("campaignId");
CREATE INDEX "MunicipalityGoal_campaignId_idx" ON "MunicipalityGoal"("campaignId");
CREATE UNIQUE INDEX "MunicipalityGoal_campaignId_city_key" ON "MunicipalityGoal"("campaignId", "city");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "ContactLog_collaboratorId_createdAt_idx" ON "ContactLog"("collaboratorId", "createdAt");
CREATE INDEX "ContactLog_campaignId_createdAt_idx" ON "ContactLog"("campaignId", "createdAt");
CREATE INDEX "ContactLog_campaignId_kind_idx" ON "ContactLog"("campaignId", "kind");
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Task_campaignId_idx" ON "Task"("campaignId");
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Church_campaignId_idx" ON "Church"("campaignId");
CREATE INDEX "Church_regional_idx" ON "Church"("regional");
CREATE INDEX "Church_denominacao_idx" ON "Church"("denominacao");
CREATE INDEX "Church_pastorId_idx" ON "Church"("pastorId");
CREATE INDEX "ChurchAssignment_churchId_idx" ON "ChurchAssignment"("churchId");
CREATE INDEX "ChurchAssignment_status_idx" ON "ChurchAssignment"("status");
CREATE INDEX "ChurchAssignment_member1Id_idx" ON "ChurchAssignment"("member1Id");
CREATE INDEX "ChurchAssignment_member2Id_idx" ON "ChurchAssignment"("member2Id");

-- Foreign Keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCampaign" ADD CONSTRAINT "UserCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCampaign" ADD CONSTRAINT "UserCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCampaign" ADD CONSTRAINT "UserCampaign_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZoneCollaborator" ADD CONSTRAINT "ZoneCollaborator_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZoneCollaborator" ADD CONSTRAINT "ZoneCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppGroup" ADD CONSTRAINT "WhatsAppGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppGroup" ADD CONSTRAINT "WhatsAppGroup_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppGroupMember" ADD CONSTRAINT "WhatsAppGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WhatsAppGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppGroupMember" ADD CONSTRAINT "WhatsAppGroupMember_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Church" ADD CONSTRAINT "Church_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Church" ADD CONSTRAINT "Church_pastorId_fkey" FOREIGN KEY ("pastorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_member1Id_fkey" FOREIGN KEY ("member1Id") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_member2Id_fkey" FOREIGN KEY ("member2Id") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;
