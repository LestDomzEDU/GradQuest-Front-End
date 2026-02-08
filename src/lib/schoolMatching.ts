function normEnum(v) {
  if (v === undefined || v === null) return null;
  return String(v).trim().toUpperCase();
}

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normNumber(v) {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function normalizeSchool(row) {
  return {
    id: row.id ?? row.school_id ?? row.schoolId ?? null,
    name: row.name ?? row.school_name ?? row.schoolName ?? "",
    type: normEnum(row.type ?? row.school_type ?? row.schoolType),
    state: normStr(row.state),
    city: normStr(row.city),
    programName: normStr(row.programName ?? row.program_name),
    programType: normStr(row.programType ?? row.program_type),
    annualTuition: row.annualTuition ?? row.annual_tuition ?? null,
    totalCost: row.totalCost ?? row.total_cost ?? null,
    applicationDeadline: normStr(
      row.applicationDeadline ?? row.application_deadline
    ),
    applicationFee: row.applicationFee ?? row.application_fee ?? null,
    description: normStr(row.description),
    websiteUrl: normStr(row.websiteUrl ?? row.website_url),
    ranking: row.ranking ?? null,
    accreditation: normStr(row.accreditation),
    enrollmentType: normEnum(row.enrollmentType ?? row.enrollment_type),
    modality: normEnum(row.modality),
    requirementType: normEnum(row.requirementType ?? row.requirement_type),
  };
}

function calculateMatchScore(school, pref) {
  let score = 0;

  const prefSchoolType = normEnum(pref.schoolType);
  const schoolType = normEnum(school.type);

  if (prefSchoolType && schoolType) {
    if (prefSchoolType === "BOTH") score += 5;
    else if (prefSchoolType === schoolType) score += 10;
  }

  if (pref.state && school.state) {
    if (
      String(pref.state).toUpperCase() === String(school.state).toUpperCase()
    ) {
      score += 10;
    }
  }

  const prefEnroll = normEnum(pref.enrollmentType);
  const schoolEnroll = normEnum(school.enrollmentType);
  if (prefEnroll && schoolEnroll && prefEnroll === schoolEnroll) score += 10;

  const prefMod = normEnum(pref.modality);
  const schoolMod = normEnum(school.modality);
  if (prefMod && schoolMod && prefMod === schoolMod) score += 10;

  const prefReq = normEnum(pref.requirementType);
  const schoolReq = normEnum(school.requirementType);
  if (prefReq && schoolReq && prefReq === schoolReq) score += 10;

  if (pref.programType && school.programType) {
    if (
      String(pref.programType).toUpperCase() ===
      String(school.programType).toUpperCase()
    ) {
      score += 10;
    }
  }

  const budget = normNumber(pref.budget);
  const annualTuition = normNumber(school.annualTuition);
  if (budget !== null && annualTuition !== null) {
    const diff = Math.abs(annualTuition - budget);
    if (diff <= 5000) {
      const budgetScore = Math.trunc(15 - diff / 1000);
      score += Math.max(10, budgetScore);
    }
  }

  return score;
}

export function computeTop5SchoolsFromRows(rows, pref) {
  const normalized = rows.map(normalizeSchool);

  const scored = normalized
    .map((s) => ({ school: s, score: calculateMatchScore(s, pref) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ar = a.school.ranking ?? Number.MAX_SAFE_INTEGER;
      const br = b.school.ranking ?? Number.MAX_SAFE_INTEGER;
      return ar - br;
    })
    .slice(0, 5)
    .map((x) => x.school);

  return scored;
}
