# Guia de Commits - Branch Developer

## Fluxo de Trabalho

### 1. Verificar Branch Atual
```bash
git branch
# Deve mostrar: * developer
```

### 2. Verificar Status das Alterações
```bash
git status
```

### 3. Adicionar Arquivos ao Staging
```bash
# Adicionar arquivos específicos
git add caminho/do/arquivo

# OU adicionar todos os arquivos modificados
git add .

# OU adicionar arquivos de forma interativa
git add -p
```

### 4. Verificar o que será commitado
```bash
git status
# Deve mostrar os arquivos em verde (staged)
```

### 5. Fazer o Commit
```bash
git commit -m "Descrição clara das alterações"
```

### 6. Enviar para o Remoto (Origin)
```bash
git push origin developer
```

## Comandos Úteis

### Ver diferenças antes de commitar
```bash
git diff                    # Ver alterações não staged
git diff --staged          # Ver alterações staged
git diff main..developer   # Comparar com main
```

### Desfazer alterações (se necessário)
```bash
# Desfazer alterações em arquivo não staged
git checkout -- arquivo

# Remover arquivo do staging (mas manter alterações)
git reset HEAD arquivo

# Desfazer último commit (mas manter alterações)
git reset --soft HEAD~1
```

### Ver histórico
```bash
git log --oneline -10      # Últimos 10 commits
git log --graph --oneline  # Visualizar branches
```

## Estrutura de Branches

- **main**: Produção (não commitar diretamente)
- **developer**: Desenvolvimento (branch de trabalho)

## Boas Práticas

1. Sempre verifique `git status` antes de commitar
2. Use mensagens de commit descritivas
3. Faça commits frequentes e pequenos
4. Nunca force push na main
5. Sempre teste antes de fazer push

