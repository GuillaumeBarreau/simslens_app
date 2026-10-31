// Les routes de suppression publiques de /1/update ont été retirées (SIMS-116).
// Ce test empêche qu'elles reviennent.
vi.hoisted(() => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test';
});

type Layer = { route?: { path: string; methods: Record<string, boolean> } };

function routePaths(router: { stack: Layer[] }) {
  return router.stack
    .filter((layer) => layer.route)
    .map(
      (layer) =>
        `${Object.keys(layer.route!.methods).join(',').toUpperCase()} ${layer.route!.path}`,
    );
}

describe('/1/update', () => {
  it('ne contient plus que les routes de rapports', () => {
    const router = require('../dataUpdater');
    expect(routePaths(router).sort()).toEqual([
      'GET /report/:reportID',
      'GET /report/queue/stats',
      'GET /report/status/:reportID',
    ]);
  });
});

describe('validation des rapports (SIMS-151)', () => {
  const { reportIdParam, reportSourceQuery } = require('../dataUpdater');

  it('accepte les identifiants Raidbots et QE', () => {
    expect(reportIdParam.validate({ reportID: 'a1B2c3D4e5F6g7H8i9J0kL' }).error).toBeUndefined();
    expect(reportIdParam.validate({ reportID: 'qe_report-1234' }).error).toBeUndefined();
  });

  it.each(['abc', '../../etc/passwd', 'a1b2c3d4?x=1', 'x'.repeat(65), 'a1b2 c3d4e5'])(
    'refuse l’identifiant %s (interpolé dans une URL sortante)',
    (reportID) => {
      expect(reportIdParam.validate({ reportID }).error).toBeDefined();
    },
  );

  it('n’accepte que les sources connues, raidbots par défaut', () => {
    expect(reportSourceQuery.validate({}).value.source).toBe('raidbots');
    expect(reportSourceQuery.validate({ source: 'qe' }).error).toBeUndefined();
    expect(reportSourceQuery.validate({ source: 'evil' }).error).toBeDefined();
  });
});
