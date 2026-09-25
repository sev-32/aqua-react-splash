(() => {
  "use strict";

  const VERSION = "LASER2_SPREADER_STANDING_RIG_V17_2_20260715";
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;
  const rigV16 = window.LASER2_RIGGING_V16;
  if (!master?.physics || !master?.rig || !master?.body || !rigV16?.standingRigConstraints) {
    console.error(`${VERSION}: required V16 rig runtime is unavailable`);
    return;
  }

  const world = master.physics;
  const rig = master.rig;
  const body = master.body;
  const cfg = master.config;
  const Vec3 = body.pos.constructor;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;

  const params = {
    enabled: true,
    inheritV16Pretension: true,
    shroudPretensionN: finite(rigV16.params?.standingRigPretensionN, 450),
    routedShroudComplianceMPerN: 4.1e-6,
    mastSpreaderStationM: finite(cfg?.mast?.spreaderFrac, 0.3866) * finite(cfg?.mast?.height, 5.82),
    mastHoundsStationM: 3.74,
    spreaderLengthM: finite(cfg?.mast?.spreaderLen, 0.42),
    spreaderSweepM: 0,
    spreaderAxialOffsetM: 0,
    bracketSideComplianceMPerN: 1.2e-8,
    bracketForeComplianceMPerN: 2.8e-8,
    bracketAxialComplianceMPerN: 1.2e-8,
    bracketDampingNsPerM: 16,
    bracketDampingForceLimitN: 160,
    diagnosticsVisible: true,
  };

  const state = {
    initialized: false,
    finite: true,
    lastError: null,
    steps: 0,
    directShroudsDisabled: 0,
    legacyCollinearStrutsDisabled: 0,
    routedShroudsInstalled: 0,
    bracketConstraintsInstalled: 0,
    maxAlignmentErrorM: 0,
    maxWrongSideM: 0,
    sourceModified: true,
  };

  const tmp = Array.from({ length: 24 }, () => new Vec3());
  const unitSide = new Vec3(1, 0, 0);
  const unitFore = new Vec3(0, 0, 1);

  function mastEndpoint(zM) {
    const segLen = finite(rig.segLen, finite(cfg.mast.height, 5.82) / Math.max(1, rig.mast.length - 1));
    const s = clamp(zM / segLen, 0, rig.mast.length - 1.000001);
    const i = Math.min(rig.mast.length - 2, Math.floor(s));
    return { type: "mast", a: rig.mast[i], b: rig.mast[i + 1], t: s - i, zM };
  }

  function particleEndpoint(particle, label) {
    return { type: "particle", p: particle, label };
  }

  function bodyEndpoint(designLocal, label) {
    const reference = master.bodyReference || tmp[23].set(0, cfg.hull.bodyReferenceY, cfg.hull.comZ);
    const local = master.designToBody
      ? master.designToBody(designLocal)
      : designLocal.clone().sub(reference);
    return { type: "body", body, local, label };
  }

  function endpointPosition(endpoint, out) {
    if (endpoint.type === "particle") return out.copy(endpoint.p.x);
    if (endpoint.type === "body") return endpoint.body.localToWorld(endpoint.local, out);
    return out.copy(endpoint.a.x).lerp(endpoint.b.x, endpoint.t);
  }

  function endpointVelocity(endpoint, out) {
    if (endpoint.type === "particle") return out.copy(endpoint.p.v);
    if (endpoint.type === "body") {
      out.copy(endpoint.body.vel || tmp[22].set(0, 0, 0));
      if (endpoint.body.omega) {
        endpoint.body.localToWorld(endpoint.local, tmp[21]);
        tmp[21].sub(endpoint.body.pos);
        tmp[20].crossVectors(endpoint.body.omega, tmp[21]);
        out.add(tmp[20]);
      }
      return out;
    }
    return out.copy(endpoint.a.v).lerp(endpoint.b.v, endpoint.t);
  }

  function endpointInvMass(endpoint, gradient, worldPosition, lever) {
    const magnitudeSquared = gradient.lengthSq();
    if (endpoint.type === "particle") return endpoint.p.w * magnitudeSquared;
    if (endpoint.type === "body") {
      if (endpoint.body.kinematic || magnitudeSquared < 1e-14) return 0;
      const magnitude = Math.sqrt(magnitudeSquared);
      lever.copy(worldPosition).sub(endpoint.body.pos);
      tmp[19].copy(gradient).multiplyScalar(1 / magnitude);
      return endpoint.body.genInvMass(lever, tmp[19]) * magnitudeSquared;
    }
    const wa = 1 - endpoint.t;
    const wb = endpoint.t;
    return (wa * wa * endpoint.a.w + wb * wb * endpoint.b.w) * magnitudeSquared;
  }

  function applyEndpointGradient(endpoint, gradient, deltaLambda, lever) {
    if (endpoint.type === "particle") {
      endpoint.p.x.addScaledVector(gradient, deltaLambda * endpoint.p.w);
      return;
    }
    if (endpoint.type === "body") {
      if (!endpoint.body.kinematic) {
        tmp[18].copy(gradient).multiplyScalar(deltaLambda);
        endpoint.body.applyCorrection(tmp[18], lever);
      }
      return;
    }
    const wa = 1 - endpoint.t;
    const wb = endpoint.t;
    endpoint.a.x.addScaledVector(gradient, deltaLambda * wa * endpoint.a.w);
    endpoint.b.x.addScaledVector(gradient, deltaLambda * wb * endpoint.b.w);
  }

  class RoutedShroudConstraint {
    constructor(chainplateEndpoint, spreaderEndpoint, houndsEndpoint, sideLabel) {
      this.endpointA = chainplateEndpoint;
      this.sheaveEndpoint = spreaderEndpoint;
      this.endpointB = houndsEndpoint;
      this.label = `${sideLabel}-shroud-routed`;
      this.sideLabel = sideLabel;
      this.alpha = params.routedShroudComplianceMPerN;
      this.lambda = 0;
      this.tension = 0;
      this.enabled = true;
      this._a = new Vec3();
      this._s = new Vec3();
      this._b = new Vec3();
      this._gA = new Vec3();
      this._gB = new Vec3();
      this._gS = new Vec3();
      this._leverA = new Vec3();
      this._leverB = new Vec3();
      this._leverS = new Vec3();
      this.untunedLength = this.measure();
      this.rest = this.untunedLength;
      this.lowerSegmentM = 0;
      this.upperSegmentM = 0;
    }

    measure() {
      endpointPosition(this.endpointA, this._a);
      endpointPosition(this.sheaveEndpoint, this._s);
      endpointPosition(this.endpointB, this._b);
      this.lowerSegmentM = this._a.distanceTo(this._s);
      this.upperSegmentM = this._b.distanceTo(this._s);
      return this.lowerSegmentM + this.upperSegmentM;
    }

    configure() {
      this.alpha = Math.max(1e-10, finite(params.routedShroudComplianceMPerN, 4.1e-6));
      const scale = Math.max(0, finite(rigV16.params?.standingRigTensionScale, 1));
      const base = params.inheritV16Pretension
        ? finite(rigV16.params?.standingRigPretensionN, params.shroudPretensionN)
        : finite(params.shroudPretensionN, 450);
      const targetPretension = Math.max(0, base * scale);
      this.rest = Math.max(0.05, this.untunedLength - targetPretension * this.alpha);
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      endpointPosition(this.endpointA, this._a);
      endpointPosition(this.sheaveEndpoint, this._s);
      endpointPosition(this.endpointB, this._b);
      this._gA.copy(this._a).sub(this._s);
      this._gB.copy(this._b).sub(this._s);
      const lenA = this._gA.length();
      const lenB = this._gB.length();
      if (lenA < 1e-9 || lenB < 1e-9) return;
      this.lowerSegmentM = lenA;
      this.upperSegmentM = lenB;
      this._gA.multiplyScalar(1 / lenA);
      this._gB.multiplyScalar(1 / lenB);
      this._gS.copy(this._gA).add(this._gB).multiplyScalar(-1);
      const C = lenA + lenB - this.rest;
      const weight =
        endpointInvMass(this.endpointA, this._gA, this._a, this._leverA) +
        endpointInvMass(this.endpointB, this._gB, this._b, this._leverB) +
        endpointInvMass(this.sheaveEndpoint, this._gS, this._s, this._leverS);
      const alphaTilde = this.alpha / Math.max(1e-10, dt * dt);
      const dlRaw = (-C - alphaTilde * this.lambda) / Math.max(1e-9, weight + alphaTilde);
      const next = Math.min(0, this.lambda + dlRaw);
      const dl = next - this.lambda;
      this.lambda = next;
      this.tension = Math.max(0, -next / Math.max(1e-10, dt * dt));
      applyEndpointGradient(this.endpointA, this._gA, dl, this._leverA);
      applyEndpointGradient(this.endpointB, this._gB, dl, this._leverB);
      applyEndpointGradient(this.sheaveEndpoint, this._gS, dl, this._leverS);
    }
  }

  function bracketBasis(stationEndpoint, sideIndex, stationOut, tangentOut, sideOut, foreOut) {
    endpointPosition(stationEndpoint, stationOut);
    const i = rig.mast.indexOf(stationEndpoint.a);
    const lo = rig.mast[Math.max(0, i - 1)].x;
    const hi = rig.mast[Math.min(rig.mast.length - 1, i + 2)].x;
    tangentOut.copy(hi).sub(lo);
    if (tangentOut.lengthSq() < 1e-10) tangentOut.copy(stationEndpoint.b.x).sub(stationEndpoint.a.x);
    tangentOut.normalize();

    sideOut.copy(unitSide).applyQuaternion(body.quat);
    sideOut.addScaledVector(tangentOut, -sideOut.dot(tangentOut));
    if (sideOut.lengthSq() < 1e-9) sideOut.set(0, 0, 1);
    sideOut.normalize().multiplyScalar(sideIndex === 0 ? -1 : 1);

    foreOut.copy(unitFore).applyQuaternion(body.quat);
    foreOut.addScaledVector(tangentOut, -foreOut.dot(tangentOut));
    foreOut.addScaledVector(sideOut, -foreOut.dot(sideOut));
    if (foreOut.lengthSq() < 1e-9) foreOut.crossVectors(sideOut, tangentOut);
    foreOut.normalize();
  }

  class SpreaderBracketConstraint {
    constructor(tip, sideIndex) {
      this.tip = tip;
      this.sideIndex = sideIndex;
      this.sideLabel = sideIndex === 0 ? "port" : "starboard";
      this.station = mastEndpoint(params.mastSpreaderStationM);
      this.enabled = true;
      this.lambda = 0;
      this.lambdas = [0, 0, 0];
      this.axisReactionN = [0, 0, 0];
      this.alignmentErrorM = 0;
      this.sideProjectionM = 0;
      this.foreOffsetM = 0;
      this.axialOffsetM = 0;
      this._station = new Vec3();
      this._tangent = new Vec3();
      this._side = new Vec3();
      this._fore = new Vec3();
      this._delta = new Vec3();
      this._correction = new Vec3();
    }

    resetStep() {
      this.lambda = 1;
      this.lambdas[0] = this.lambdas[1] = this.lambdas[2] = 0;
      this.axisReactionN[0] = this.axisReactionN[1] = this.axisReactionN[2] = 0;
    }

    _solveAxis(axis, target, compliance, key, dt) {
      this._delta.copy(this.tip.x).sub(this._station);
      const C = this._delta.dot(axis) - target;
      const wa = 1 - this.station.t;
      const wb = this.station.t;
      const weight = this.tip.w + wa * wa * this.station.a.w + wb * wb * this.station.b.w;
      const alphaTilde = Math.max(0, compliance) / Math.max(1e-10, dt * dt);
      const old = this.lambdas[key];
      const dl = (-C - alphaTilde * old) / Math.max(1e-9, weight + alphaTilde);
      this.lambdas[key] = old + dl;
      this.axisReactionN[key] = Math.abs(this.lambdas[key]) / Math.max(1e-10, dt * dt);
      this.tip.x.addScaledVector(axis, dl * this.tip.w);
      this.station.a.x.addScaledVector(axis, -dl * wa * this.station.a.w);
      this.station.b.x.addScaledVector(axis, -dl * wb * this.station.b.w);
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      bracketBasis(this.station, this.sideIndex, this._station, this._tangent, this._side, this._fore);
      this._solveAxis(
        this._side,
        Math.max(0.05, finite(params.spreaderLengthM, 0.42)),
        finite(params.bracketSideComplianceMPerN, 1.2e-8),
        0,
        dt,
      );
      bracketBasis(this.station, this.sideIndex, this._station, this._tangent, this._side, this._fore);
      this._solveAxis(
        this._fore,
        finite(params.spreaderSweepM, 0),
        finite(params.bracketForeComplianceMPerN, 2.8e-8),
        1,
        dt,
      );
      bracketBasis(this.station, this.sideIndex, this._station, this._tangent, this._side, this._fore);
      this._solveAxis(
        this._tangent,
        finite(params.spreaderAxialOffsetM, 0),
        finite(params.bracketAxialComplianceMPerN, 1.2e-8),
        2,
        dt,
      );
      this.measure();
    }

    measure() {
      bracketBasis(this.station, this.sideIndex, this._station, this._tangent, this._side, this._fore);
      this._delta.copy(this.tip.x).sub(this._station);
      this.sideProjectionM = this._delta.dot(this._side);
      this.foreOffsetM = this._delta.dot(this._fore);
      this.axialOffsetM = this._delta.dot(this._tangent);
      const sideError = this.sideProjectionM - finite(params.spreaderLengthM, 0.42);
      const foreError = this.foreOffsetM - finite(params.spreaderSweepM, 0);
      const axialError = this.axialOffsetM - finite(params.spreaderAxialOffsetM, 0);
      this.alignmentErrorM = Math.hypot(sideError, foreError, axialError);
      return this.alignmentErrorM;
    }

    applyDamping() {
      if (!this.enabled || !params.enabled) return;
      bracketBasis(this.station, this.sideIndex, this._station, this._tangent, this._side, this._fore);
      const wa = 1 - this.station.t;
      const wb = this.station.t;
      tmp[0].copy(this.station.a.v).multiplyScalar(wa).addScaledVector(this.station.b.v, wb);
      tmp[1].copy(this.tip.v).sub(tmp[0]);
      tmp[2].set(0, 0, 0);
      const damping = Math.max(0, finite(params.bracketDampingNsPerM, 16));
      tmp[2].addScaledVector(this._side, -damping * tmp[1].dot(this._side));
      tmp[2].addScaledVector(this._fore, -damping * tmp[1].dot(this._fore));
      tmp[2].addScaledVector(this._tangent, -0.45 * damping * tmp[1].dot(this._tangent));
      const limit = Math.max(0, finite(params.bracketDampingForceLimitN, 160));
      if (limit > 0 && tmp[2].length() > limit) tmp[2].setLength(limit);
      this.tip.f.add(tmp[2]);
      this.station.a.f.addScaledVector(tmp[2], -wa);
      this.station.b.f.addScaledVector(tmp[2], -wb);
    }
  }

  // Calibrate the mast socket's designed sweep/cant from the untouched V17.1
  // geometry before the first dynamic step. The original spreader tripod is
  // swept about 160 mm in the fore/aft plane; preserving that baseline avoids
  // fighting its three short structural struts while still removing the free
  // azimuthal degree of freedom.
  {
    const station = mastEndpoint(params.mastSpreaderStationM);
    let sideSum = 0;
    let foreSum = 0;
    let axialSum = 0;
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      bracketBasis(station, sideIndex, tmp[3], tmp[4], tmp[5], tmp[6]);
      tmp[7].copy(rig.spreaderTips[sideIndex].x).sub(tmp[3]);
      sideSum += tmp[7].dot(tmp[5]);
      foreSum += tmp[7].dot(tmp[6]);
      axialSum += tmp[7].dot(tmp[4]);
    }
    params.spreaderLengthM = Math.max(0.05, sideSum * 0.5);
    params.spreaderSweepM = foreSum * 0.5;
    params.spreaderAxialOffsetM = axialSum * 0.5;
  }

  const mastSet = new Set(rig.mast);
  const spreaderNodeIndex = Math.round(params.mastSpreaderStationM / Math.max(1e-9, rig.segLen));
  const legacyCollinearStruts = [];
  for (const tip of rig.spreaderTips) {
    for (const constraint of world.constraints) {
      if (!constraint?.a || !constraint?.b || constraint.enabled === false) continue;
      const other = constraint.a === tip && mastSet.has(constraint.b)
        ? constraint.b
        : constraint.b === tip && mastSet.has(constraint.a)
          ? constraint.a
          : null;
      if (!other) continue;
      const mastIndex = rig.mast.indexOf(other);
      if (Math.abs(mastIndex - spreaderNodeIndex) > 2) continue;
      constraint.v172PreviousEnabled = constraint.enabled;
      constraint.enabled = false;
      legacyCollinearStruts.push(constraint);
      state.legacyCollinearStrutsDisabled++;
    }
  }

  const oldDirectShrouds = rigV16.standingRigConstraints.filter(
    (constraint) => constraint?.label === "port-shroud" || constraint?.label === "starboard-shroud",
  );
  for (const constraint of oldDirectShrouds) {
    constraint.v172PreviousEnabled = constraint.enabled;
    constraint.enabled = false;
    constraint.tension = 0;
    state.directShroudsDisabled++;
  }

  if (state.directShroudsDisabled !== 2 || state.legacyCollinearStrutsDisabled !== 6 || !Array.isArray(rig.spreaderTips) || rig.spreaderTips.length !== 2) {
    state.finite = false;
    state.lastError = `expected two direct shrouds, six collinear struts, and two spreader tips; found ${state.directShroudsDisabled} / ${state.legacyCollinearStrutsDisabled} / ${rig.spreaderTips?.length || 0}`;
    console.error(`${VERSION}: ${state.lastError}`);
    return;
  }

  const hounds = mastEndpoint(params.mastHoundsStationM);
  const routedShrouds = [];
  const bracketConstraints = [];
  for (let side = 0; side < 2; side++) {
    const label = side === 0 ? "port" : "starboard";
    const cable = new RoutedShroudConstraint(
      bodyEndpoint(rig.chainD[side], `${label}-chainplate`),
      particleEndpoint(rig.spreaderTips[side], `${label}-spreader-tip`),
      hounds,
      label,
    );
    cable.configure();
    world.addC(cable);
    routedShrouds.push(cable);
    state.routedShroudsInstalled++;

    const bracket = new SpreaderBracketConstraint(rig.spreaderTips[side], side);
    bracket.resetStep();
    world.addC(bracket);
    bracketConstraints.push(bracket);
    state.bracketConstraintsInstalled++;
  }

  function configure() {
    for (const direct of oldDirectShrouds) {
      direct.enabled = false;
      direct.tension = 0;
    }
    for (const cable of routedShrouds) {
      cable.enabled = !!params.enabled;
      cable.configure();
      cable.lambda = 0;
    }
    for (const bracket of bracketConstraints) {
      bracket.enabled = !!params.enabled;
      bracket.station = mastEndpoint(params.mastSpreaderStationM);
      bracket.resetStep();
      bracket.applyDamping();
    }
    state.steps++;
  }

  world.forceHooks.push(configure);

  function mastFlexSensitivity(probeDeflectionM = 0.01) {
    const deflection = clamp(Math.abs(finite(probeDeflectionM, 0.01)), 0.001, 0.1);
    const spreaderRatio = clamp(
      Math.pow(
        finite(params.mastSpreaderStationM, 2.25) /
          Math.max(0.1, finite(params.mastHoundsStationM, 3.74)),
        2,
      ),
      0,
      1,
    );
    const bodySide = new Vec3(1, 0, 0).applyQuaternion(body.quat).normalize();

    function sample(sign) {
      const result = {};
      routedShrouds.forEach((cable, sideIndex) => {
        const chainplate = new Vec3();
        const spreader = new Vec3();
        const houndsNow = new Vec3();
        endpointPosition(cable.endpointA, chainplate);
        endpointPosition(cable.sheaveEndpoint, spreader);
        endpointPosition(cable.endpointB, houndsNow);
        const baseLength = chainplate.distanceTo(spreader) + houndsNow.distanceTo(spreader);
        const shiftedSpreader = spreader.clone().addScaledVector(bodySide, sign * deflection * spreaderRatio);
        const shiftedHounds = houndsNow.clone().addScaledVector(bodySide, sign * deflection);
        const shiftedLength = chainplate.distanceTo(shiftedSpreader) + shiftedHounds.distanceTo(shiftedSpreader);
        const deltaLengthM = shiftedLength - baseLength;
        result[sideIndex === 0 ? "port" : "starboard"] = {
          deltaLengthM,
          elasticTensionDeltaN: deltaLengthM / Math.max(1e-10, finite(params.routedShroudComplianceMPerN, 4.1e-6)),
        };
      });
      return result;
    }

    const positiveBodySide = sample(1);
    const negativeBodySide = sample(-1);
    const opposedResponse =
      positiveBodySide.port.deltaLengthM * positiveBodySide.starboard.deltaLengthM < 0 &&
      negativeBodySide.port.deltaLengthM * negativeBodySide.starboard.deltaLengthM < 0;
    return {
      probeDeflectionM: deflection,
      assumedCantileverSpreaderDeflectionRatio: spreaderRatio,
      positiveBodySide,
      negativeBodySide,
      opposedResponse,
      statement: "A live lateral mast bend lengthens one routed shroud while shortening the opposite shroud; unilateral cable tension therefore rises on one side and unloads on the other.",
    };
  }

  const originalRigMetrics = rigV16.metrics.bind(rigV16);
  function metrics() {
    const sides = bracketConstraints.map((bracket, side) => {
      bracket.measure();
      const cable = routedShrouds[side];
      cable.measure();
      return {
        side: side === 0 ? "port" : "starboard",
        spreaderLengthM: bracket.sideProjectionM,
        foreOffsetM: bracket.foreOffsetM,
        axialOffsetM: bracket.axialOffsetM,
        alignmentErrorM: bracket.alignmentErrorM,
        correctSide: bracket.sideProjectionM > 0,
        bracketReactionN: Math.hypot(...bracket.axisReactionN),
        bracketAxisReactionN: [...bracket.axisReactionN],
        shroudTensionN: Math.max(0, finite(cable.tension, 0)),
        shroudTotalLengthM: cable.lowerSegmentM + cable.upperSegmentM,
        shroudRestLengthM: cable.rest,
        lowerShroudSegmentM: cable.lowerSegmentM,
        upperShroudSegmentM: cable.upperSegmentM,
      };
    });
    state.maxAlignmentErrorM = Math.max(...sides.map((side) => side.alignmentErrorM));
    state.maxWrongSideM = Math.max(0, ...sides.map((side) => Math.max(0, -side.spreaderLengthM)));
    const finiteNow = sides.every((side) => Object.values(side).every((value) => typeof value !== "number" || Number.isFinite(value)));
    state.finite = state.finite && finiteNow;
    if (!finiteNow && !state.lastError) state.lastError = "non-finite spreader or routed-shroud telemetry";
    return {
      version: VERSION,
      enabled: params.enabled,
      finite: state.finite,
      lastError: state.lastError,
      directShroudsDisabled: state.directShroudsDisabled,
      legacyCollinearStrutsDisabled: state.legacyCollinearStrutsDisabled,
      routedShroudsInstalled: state.routedShroudsInstalled,
      bracketConstraintsInstalled: state.bracketConstraintsInstalled,
      loadPath: "chainplate → spreader tip → 3.74 m mast hounds; compliant mast socket transfers reaction into the flexible mast",
      mastCoupling: "port and starboard total-length shrouds solve independently from live mast/spreader geometry",
      mastFlexSensitivity: mastFlexSensitivity(0.01),
      sides,
      tensionDifferenceN: sides[1].shroudTensionN - sides[0].shroudTensionN,
      maxAlignmentErrorM: state.maxAlignmentErrorM,
      maxWrongSideM: state.maxWrongSideM,
      parameters: { ...params },
      sourceModified: true,
    };
  }

  rigV16.metrics = function (...args) {
    const base = originalRigMetrics(...args);
    const spreader = metrics();
    if (base?.loads) {
      base.loads.shroudsN = spreader.sides.map((side) => side.shroudTensionN);
      base.loads.standingCablesN = {
        ...(base.loads.standingCablesN || {}),
        "port-shroud": spreader.sides[0].shroudTensionN,
        "starboard-shroud": spreader.sides[1].shroudTensionN,
        "port-shroud-routed": spreader.sides[0].shroudTensionN,
        "starboard-shroud-routed": spreader.sides[1].shroudTensionN,
      };
    }
    base.spreaders = spreader;
    return base;
  };

  function setParam(name, value) {
    if (!(name in params)) return false;
    if (typeof params[name] === "boolean") params[name] = !!value;
    else if (!Number.isFinite(+value)) return false;
    else params[name] = +value;
    for (const cable of routedShrouds) cable.configure();
    return true;
  }

  function restoreLegacy() {
    for (const cable of routedShrouds) cable.enabled = false;
    for (const bracket of bracketConstraints) bracket.enabled = false;
    for (const direct of oldDirectShrouds) direct.enabled = direct.v172PreviousEnabled !== false;
    for (const strut of legacyCollinearStruts) strut.enabled = strut.v172PreviousEnabled !== false;
    params.enabled = false;
  }

  const receipt = Object.freeze({
    fault: "V16 direct shrouds bypassed the spreader tips, leaving the three collinear mast struts azimuthally under-constrained",
    repair: "replace each direct shroud with a tension-only total-length chainplate/spreader/hounds constraint; replace the six azimuth-free collinear distance struts with one compliant 3-axis mast socket per side",
    mastFlex: "hounds and spreader station are live interpolated mast endpoints, so mast bend changes each side cable length and tension independently",
    truthBoundary: "spreader bracket compliance and pretension remain calibrated parameters until measured hardware stiffness and tuned wire lengths are supplied",
  });

  window.LASER2_SPREADER_RIG_V17_2 = {
    VERSION,
    params,
    state,
    oldDirectShrouds,
    legacyCollinearStruts,
    routedShrouds,
    bracketConstraints,
    metrics,
    mastFlexSensitivity,
    setParam,
    restoreLegacy,
    receipt,
  };

  const previousMetrics = window.__labMetrics;
  window.__labMetrics = function () {
    const base = typeof previousMetrics === "function" ? previousMetrics() : {};
    return { ...base, spreaderRigV17_2: metrics() };
  };

  state.initialized = true;
  console.info(`${VERSION} initialized`, metrics(), receipt);
})();
