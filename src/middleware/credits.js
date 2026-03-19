const requireCredits = (amount = 1) => {
  return (req, res, next) => {
    if (req.user.credits < amount) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: amount,
        balance: req.user.credits,
      });
    }
    req.creditCost = amount;
    next();
  };
};

module.exports = { requireCredits };
