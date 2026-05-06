from fastapi.security import OAuth2PasswordBearer

# OAuth2 scheme для всього додатку
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
