# Branch Protection Rules v1.0.3

## Protect these branches

```text
main
master
production
release/*
```

## Recommended GitHub settings

For production branches:

```text
Require a pull request before merging: ON
Require approvals: 1 or more
Require status checks to pass before merging: ON
Require branches to be up to date before merging: ON
Require conversation resolution before merging: ON
Restrict force pushes: ON
Allow deletions: OFF
```

## Staging branch

Current staging branch:

```text
staging/v1.0.3-final-gate-pass
```

Staging is allowed for CI preparation and documentation cleanup only. Production merge remains blocked until Senior production-release approval.
