/// Build swift test arguments for a given package path
pub fn build_args(package_path: &str, filter: Option<&str>) -> Vec<String> {
    let mut args = vec!["test".to_string()];

    args.extend(["--package-path".to_string(), package_path.to_string()]);

    if let Some(f) = filter {
        args.extend(["--filter".to_string(), f.to_string()]);
    }

    args
}
