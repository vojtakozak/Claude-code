use crate::error::{AppError, Result};
use keyring::Entry;

const SERVICE: &str = "cz.fellaship.brain";
const ACCOUNT: &str = "anthropic_api_key";

pub fn get_api_key() -> Result<Option<String>> {
    let entry = Entry::new(SERVICE, ACCOUNT)?;
    match entry.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Keychain(e.to_string())),
    }
}

pub fn set_api_key(key: &str) -> Result<()> {
    let entry = Entry::new(SERVICE, ACCOUNT)?;
    entry.set_password(key)?;
    Ok(())
}

#[allow(dead_code)]
pub fn delete_api_key() -> Result<()> {
    let entry = Entry::new(SERVICE, ACCOUNT)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Keychain(e.to_string())),
    }
}
