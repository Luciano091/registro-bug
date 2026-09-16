from database import SessionLocal
import models
db = SessionLocal()
est = db.query(models.Estabelecimento).filter(models.Estabelecimento.slug == "bisburger").first()
if est:
    config = db.query(models.Configuracao).filter(models.Configuracao.estabelecimento_id == est.id).first()
    print("Senha hash is:", config.senha_admin)
else:
    print("Not found")
