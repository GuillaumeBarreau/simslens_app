use std::path::{Path, PathBuf};

/// Locate the `_retail_` directory of a World of Warcraft install.
///
/// On Windows the registry usually carries the InstallPath; everywhere else we
/// probe a handful of well-known locations so dev on macOS still surfaces an
/// install if you have one.
pub fn find_install() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        if let Some(p) = find_windows_registry() {
            if validate(&p) {
                return Some(p);
            }
        }
    }

    for candidate in default_candidates() {
        if validate(&candidate) {
            return Some(candidate);
        }
    }
    None
}

/// Returns true if the path looks like a `_retail_` folder (contains `WTF/`).
pub fn validate(path: &Path) -> bool {
    path.is_dir() && path.join("WTF").is_dir()
}

#[cfg(target_os = "windows")]
fn find_windows_registry() -> Option<PathBuf> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey("SOFTWARE\\Blizzard Entertainment\\World of Warcraft")
        .ok()?;
    let install: String = key.get_value("InstallPath").ok()?;
    // Blizzard stores e.g. "C:\Program Files (x86)\World of Warcraft\_retail_\".
    let p = PathBuf::from(install.trim_end_matches(['\\', '/']));
    Some(p)
}

fn default_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    #[cfg(target_os = "windows")]
    {
        out.push(PathBuf::from(
            r"C:\Program Files (x86)\World of Warcraft\_retail_",
        ));
        out.push(PathBuf::from(r"C:\Program Files\World of Warcraft\_retail_"));
    }
    #[cfg(target_os = "macos")]
    {
        out.push(PathBuf::from("/Applications/World of Warcraft/_retail_"));
    }
    out
}
