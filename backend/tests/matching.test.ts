import { expect } from 'chai';
import { matchingService } from '../src/services/matching.service';

describe('Explainable Ranked Matching Engine', () => {
  it('should verify red blood cell compatibility matrix', () => {
    // O- recipient can ONLY receive O-
    const oNegCompatible = matchingService.getCompatibleGroups('O-', 'packed_red_cells');
    expect(oNegCompatible).to.deep.equal(['O-']);

    // AB+ recipient can receive all 8 blood groups
    const abPosCompatible = matchingService.getCompatibleGroups('AB+', 'packed_red_cells');
    expect(abPosCompatible.length).to.equal(8);

    // A+ can receive O-, O+, A-, A+
    const aPosCompatible = matchingService.getCompatibleGroups('A+', 'packed_red_cells');
    expect(aPosCompatible).to.include('O-');
    expect(aPosCompatible).to.include('A+');
    expect(aPosCompatible).to.not.include('B+');
  });

  it('should verify plasma compatibility inversion (AB is universal plasma donor)', () => {
    // AB+ recipient for plasma receives from AB-, AB+
    const abPlasma = matchingService.getCompatibleGroups('AB+', 'fresh_frozen_plasma');
    expect(abPlasma).to.deep.equal(['AB-', 'AB+']);

    // O- recipient for plasma can receive all types (O is universal plasma recipient)
    const oPlasma = matchingService.getCompatibleGroups('O-', 'fresh_frozen_plasma');
    expect(oPlasma.length).to.equal(8);
  });

  it('should calculate Haversine distance accurately', () => {
    // Times Square to Central Park (approx 1.5 - 2.5 km)
    const dist = matchingService.calculateDistance(40.758, -73.9855, 40.7829, -73.9654);
    expect(dist).to.be.above(2.0);
    expect(dist).to.be.below(3.5);
  });

  it('should rank verified inventory ahead of donors and include transparent explanations', async () => {
    const matches = await matchingService.findRankedMatches({
      recipientBloodGroup: 'O-',
      componentType: 'packed_red_cells',
      unitsRequested: 2,
      urgencyLevel: 'emergency',
      hospitalLat: 40.7516,
      hospitalLng: -73.9754,
    });

    expect(matches.length).to.be.above(0);

    // Top match should be verified blood bank inventory
    const topMatch = matches[0];
    expect(topMatch.candidateType).to.equal('inventory');
    expect(topMatch.score).to.be.above(80);
    expect(topMatch.reasons.length).to.be.above(0);
    expect(topMatch.medicalDisclaimer).to.include('NOTICE: BloodBridge software matching algorithms');

    // Donor matches should be included with explainability
    const donorMatch = matches.find((m) => m.candidateType === 'donor');
    expect(donorMatch).to.be.not.undefined;
    expect(donorMatch?.donorDetails).to.be.not.undefined;
  });
});
