# #READY Install plugins if they exist in config
<!--
#imdone-1.54.9
#feature
created:2025-03-04T15:01:11-05:00
order:0
-->

I would like plugins to be insalled if they exist in the config but are not installed on the system so I can keep the config in source control, but not plugins

## Outcome

`.imdone` directory should only have the following stored in git. Everything else should be ignored.

```
.imdone
├── actions
├── config.yml
├── properties
└── templates
```

.gitignore should look like this:

```
# Imdone
.imdone/*
!.imdone/config.yml
!.imdone/actions
!.imdone/properties
!.imdone/templates
``` 

## :ballot_box_with_check: Tasks

- [x] Refactor ImdonePlugins to use imdone core plugin lookup
- [x] Install plugins that are in config but not in plugins dir
- [ ] Test command line with only config.yml and a plugin with an action.

## :white_check_mark: DoD

- [ ] Code complete (No Tech Debt)
- [ ] Update tests
- [ ] Automate what's working
- [ ] Update tutorial project
- [ ] Update documentation
- [ ] Run like a new user and make the experience better
- [ ] Make sure the first card is expanded by default or in view mode
- [ ] Make sure global and default settings isn't modified when opened for the first time



