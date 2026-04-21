use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("keychain error: {0}")]
    Keychain(String),

    #[error("missing anthropic api key")]
    ApiKeyMissing,

    #[error("anthropic api error ({status}): {message}")]
    Anthropic { status: u16, message: String },

    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("parse error: {0}")]
    Parse(String),

    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("other: {0}")]
    Other(String),
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self {
        AppError::Keychain(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Parse(e.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut st = ser.serialize_struct("AppError", 2)?;
        let code = match self {
            AppError::ApiKeyMissing => "api_key_missing",
            AppError::Anthropic { .. } => "anthropic_error",
            AppError::Db(_) => "db_error",
            AppError::Keychain(_) => "keychain_error",
            AppError::Http(_) => "http_error",
            AppError::Parse(_) => "parse_error",
            AppError::Io(_) => "io_error",
            AppError::Tauri(_) => "tauri_error",
            AppError::Other(_) => "other",
        };
        st.serialize_field("code", code)?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
