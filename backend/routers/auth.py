import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from database import (
    get_user_by_email,
    create_user,
    get_user_by_id,
    create_refresh_token,
    validate_refresh_token,
    revoke_refresh_token,
    revoke_all_refresh_tokens,
)
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "pseudogen_rt"
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
_COOKIE_MAX_AGE = 7 * 24 * 3600


def _set_refresh_cookie(response: Response, token_value: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token_value,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=_COOKIE_MAX_AGE,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_COOKIE_NAME, path="/auth")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    plan: str


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, response: Response):
    if len(req.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    if get_user_by_email(req.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    hashed = hash_password(req.password)
    user = create_user(req.email, hashed)
    access_token = create_access_token({"sub": str(user["id"])})
    refresh_value = create_refresh_token(user["id"])
    _set_refresh_cookie(response, refresh_value)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, response: Response):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token({"sub": str(user["id"])})
    refresh_value = create_refresh_token(user["id"])
    _set_refresh_cookie(response, refresh_value)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response):
    token_value = request.cookies.get(_COOKIE_NAME)
    if not token_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    user_id = validate_refresh_token(token_value)
    if user_id is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or invalid")
    user = get_user_by_id(user_id)
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    revoke_refresh_token(token_value)
    new_access = create_access_token({"sub": str(user["id"])})
    new_refresh = create_refresh_token(user["id"])
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=new_access)


@router.post("/logout")
def logout(request: Request, response: Response):
    token_value = request.cookies.get(_COOKIE_NAME)
    if token_value:
        revoke_refresh_token(token_value)
    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}


@router.post("/logout-all")
def logout_all(response: Response, user: dict = Depends(get_current_user)):
    revoke_all_refresh_tokens(user["id"])
    _clear_refresh_cookie(response)
    return {"detail": "All sessions revoked"}


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], plan=user["plan"])
