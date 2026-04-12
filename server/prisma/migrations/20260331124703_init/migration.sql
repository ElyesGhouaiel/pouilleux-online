-- CreateTable
CREATE TABLE "joueur" (
    "id" SERIAL NOT NULL,
    "pseudo" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "joueur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partie" (
    "id" SERIAL NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),

    CONSTRAINT "partie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation" (
    "id" SERIAL NOT NULL,
    "joueur_id" INTEGER NOT NULL,
    "partie_id" INTEGER NOT NULL,
    "est_perdant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "participation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "joueur_email_key" ON "joueur"("email");

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_joueur_id_fkey" FOREIGN KEY ("joueur_id") REFERENCES "joueur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_partie_id_fkey" FOREIGN KEY ("partie_id") REFERENCES "partie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
