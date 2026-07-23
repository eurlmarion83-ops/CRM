export type AgendaAppointment = {
  id: string;
  start: string;
  end: string;
  status: string;
  practitionerId: string;
  practitionerName: string;
  practitionerColor: string;
  patientName: string;
  patientPhone: string | null;
  motifName: string;
  motifColor: string;
  isVideo: boolean;
  roomName: string | null;
};

export type AgendaPractitioner = { id: string; name: string; color: string };

export type AgendaMotif = {
  id: string;
  practitionerId: string;
  name: string;
  color: string;
  durationMin: number;
  type: "CABINET" | "DOMICILE" | "VIDEO";
};

export type AgendaView = "liste" | "jour" | "semaine" | "mois";
