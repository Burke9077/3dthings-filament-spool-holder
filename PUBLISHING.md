# Publishing

This project stays unpublished on third-party model sites until a complete
physical print has been assembled and approved.

## Release policy

- Pull requests and merges never publish a marketplace listing.
- GitHub Releases are the canonical, versioned source for generated files.
- The **Prepare release** workflow defaults to a build-only candidate.
- Creating a public GitHub Release requires all of:
  - running the workflow from `main`;
  - a semantic version such as `v0.1.0`;
  - enabling the `publish_release` input; and
  - entering the exact confirmation `PHYSICALLY_TESTED`.
- Publishing or updating Thingiverse and Printables remains a separate,
  deliberate operation.

This keeps a code review or routine Pages deployment from becoming a product
release.

## Build a release candidate

Open **Actions → Prepare release → Run workflow**.

For a build-only rehearsal:

1. Leave `version` as `unreleased`.
2. Leave `publish_release` disabled.
3. Run the workflow.
4. Download and inspect the `spool-holder-release-unreleased` artifact.

The artifact contains the default STLs, OpenSCAD source, renders, listing copy,
manifest, checksums, and a complete ZIP. It is not a GitHub Release and does
not upload anything to a model marketplace.

The same package can be built locally:

```sh
./scripts/build-release.sh unreleased
```

## First public release

After the physical acceptance print succeeds:

1. Add clear photos of the assembled holder, loaded spool, nut traps, axle, and
   linked modules.
2. Update [`publishing/LISTING.md`](publishing/LISTING.md) with any lessons from
   the print.
3. Run a build-only candidate using the intended version, such as `v0.1.0`.
4. Inspect every STL, image, manifest entry, checksum, and the packaged source.
5. Re-run **Prepare release** from `main` with:
   - `version`: the inspected semantic version;
   - `publish_release`: enabled; and
   - `confirmation`: `PHYSICALLY_TESTED`.
6. Review the resulting GitHub Release before creating marketplace drafts.

## Thingiverse

Thingiverse has an official OAuth2 API that can create and patch Things, upload
files and images, and publish a completed Thing:

- [Thingiverse API getting started](https://www.thingiverse.com/developers/getting-started)
- [Thingiverse upload guide](https://www.thingiverse.com/developers/upload-guide)

There is no mature GitHub Action worth trusting with the account token today.
The closest general-purpose deployer,
[Threedeploy](https://github.com/Chrismettal/Threedeploy), labels itself WIP and
notes that description updates are broken. The newer
[`thingiverse-client`](https://github.com/nomike/thingiverse-client) project is
an alpha SDK and still exposes the multi-step upload flow at a low level.

For the first release, create and review a Thingiverse draft manually using the
GitHub Release assets. Record its Thing ID only after the draft is correct.
That gives a safe target against which a small first-party sync script can be
tested before any automated publish operation is enabled.

## Printables

Printables does not document a supported public write API for creating or
updating model listings. Its official guidance uses the website upload flow.
Community scripts rely on private GraphQL operations or stored browser
sessions, which are fragile and inappropriate for a long-lived repository
secret.

Upload the inspected GitHub Release assets manually. Printables has also
offered a Thingiverse import flow that creates drafts, which can reduce the
initial data entry if it is still available when this project launches. Prusa
has [documented that import
flow](https://blog.prusa3d.com/winter-contest_31019/). Always
review the imported draft and upload the physical photos before publishing.

Until Printables offers a supported write API, manual publication is the
reliable path.
