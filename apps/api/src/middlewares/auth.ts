import { Request,Response,NextFunction } from 'express'; import jwt from 'jsonwebtoken'; import { env } from '../config/env.js';
export type AuthUser={sub:string;role:'MEMBER'|'COMPANY'|'ADMIN'};
declare global { namespace Express { interface Request { auth?:AuthUser } } }
export function requireAuth(req:Request,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith('Bearer ')) return res.status(401).json({message:'Não autenticado'});try{req.auth=jwt.verify(h.slice(7),env.JWT_SECRET) as AuthUser;next();}catch{return res.status(401).json({message:'Token inválido'});}}
export const requireRole=(...roles:AuthUser['role'][])=>(req:Request,res:Response,next:NextFunction)=>req.auth&&roles.includes(req.auth.role)?next():res.status(403).json({message:'Acesso negado'});
